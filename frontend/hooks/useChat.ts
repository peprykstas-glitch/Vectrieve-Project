import React, { useState, useRef } from "react";
import { apiClient } from "@/lib/api/client";

export interface Source {
  content: string;
  filename: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachedFiles?: string[];
  sources?: Source[];
  isStreaming?: boolean;
  suggestions?: string[];
}

/**
 * useChat — Manages chat state with SSE streaming support.
 *
 * Flow for each user query:
 *  1. Append the user message to the local messages array.
 *  2. Append a placeholder assistant message with isStreaming=true.
 *  3. POST to /api/proxy/chat/stream and read the response as a ReadableStream.
 *  4. Parse SSE events: "session" sets sessionId+sources, "token" appends text,
 *     "done" clears the streaming flag, "error" shows an error message.
 */
export function useChat(
  computeMode: string,
  aiPersona: string,
  initialSessionId?: string | null,
  initialSpaceId?: string | null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(
    initialSessionId || undefined
  );
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(
    initialSpaceId ?? null
  );
  const isQueryingRef = useRef(false);

  // --- Load chat history if we're restoring an existing session ---
  React.useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      setIsLoading(true);
      const query = activeSpaceId ? `?space_id=${encodeURIComponent(activeSpaceId)}` : '';
      apiClient<any>(`/sessions/${initialSessionId}${query}`)
        .then((data) => {
          if (data && data.messages) {
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id.toString(),
                role: m.role,
                content: m.content,
                sources: m.sources || undefined,
              }))
            );
          }
        })
        .catch((err) => console.error("Failed to load chat history:", err))
        .finally(() => setIsLoading(false));
    } else {
      setSessionId(undefined);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello. I am Vectrieve Core. How can I assist with your data analysis today?",
        },
      ]);
    }
  }, [initialSessionId, activeSpaceId]);

  const submitQuery = async (queryText: string, attachedFiles: File[]) => {
    if ((!queryText.trim() && attachedFiles.length === 0) || isQueryingRef.current) return;

    isQueryingRef.current = true;
    setIsLoading(true);

    const fileNames = attachedFiles.map((f) => f.name);
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    // Append user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: queryText.trim(),
        attachedFiles: fileNames.length > 0 ? fileNames : undefined,
      },
    ]);

    // Append streaming placeholder for assistant
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);

    try {
      // Upload any attached files first (in parallel) and wait for them to fully index
      if (attachedFiles.length > 0) {
        // Show processing indicator in the assistant placeholder
        setIsProcessingFiles(true);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "⏳ Uploading and indexing files, please wait..." }
              : m
          )
        );

        let uploadedDocs: any[];
        try {
          uploadedDocs = await Promise.all(
            attachedFiles.map(async (file) => {
              const fileData = new FormData();
              fileData.append("file", file);
              if (activeSpaceId) {
                fileData.append("space_id", activeSpaceId);
              }
              return apiClient<any>("/upload", {
                method: "POST",
                body: fileData,
              });
            })
          );
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          setIsProcessingFiles(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: `❌ File upload failed. Please try again or upload via the Knowledge Base tab.`,
                    isStreaming: false,
                  }
                : m
            )
          );
          return;
        }

        // Poll until COMPLETED — waits through PENDING, PROCESSING, and EMBEDDING
        // Bug fix: previously only COMPLETED/FAILED were handled, so EMBEDDING caused a timeout
        // and the query was fired anyway without the file being indexed in Qdrant.
        const docIds = uploadedDocs.map((doc) => doc.id);
        const POLL_INTERVAL_MS = 1500;
        const MAX_POLL_TIME_MS = 120_000; // 120s — accounts for large files embedding via local Ollama

        const pollFileStatus = async (id: number): Promise<{ ok: boolean; error?: string }> => {
          const deadline = Date.now() + MAX_POLL_TIME_MS;
          while (Date.now() < deadline) {
            try {
              const doc = await apiClient<any>(`/upload/${id}`);
              const status = (doc.status ?? "").toUpperCase();

              if (status === "COMPLETED") {
                return { ok: true };
              }
              if (status === "FAILED") {
                return { ok: false, error: doc.error_log || "File parsing failed." };
              }
              // PENDING / PROCESSING / EMBEDDING — still working, keep waiting
            } catch (err) {
              console.error(`Error polling file status for id=${id}:`, err);
            }
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
          // Timed out
          return { ok: false, error: `File processing timed out after ${MAX_POLL_TIME_MS / 1000}s.` };
        };

        const pollResults = await Promise.all(docIds.map((id) => pollFileStatus(id)));
        const failedResult = pollResults.find((r) => !r.ok);

        setIsProcessingFiles(false);

        if (failedResult) {
          // Bug fix: previously the query was sent even on failure/timeout.
          // Now we stop and show a clear error message.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: `❌ Could not index file: ${failedResult.error}\n\nPlease try uploading via the **Knowledge Base** tab where you can monitor the status, then ask your question again.`,
                    isStreaming: false,
                  }
                : m
            )
          );
          return;
        }

        // Clear the processing placeholder so streaming tokens start fresh
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: "" } : m
          )
        );
      }

      const queryPayload: any = {
        messages: [{ role: "user", content: queryText }],
        thinking_mode: aiPersona,
        mode: computeMode,
      };

      if (fileNames.length > 0) {
        queryPayload.attached_filenames = fileNames;
      }

      if (activeSpaceId) {
        queryPayload.space_id = activeSpaceId;
      }

      if (computeMode === 'local') {
        const storedModel = localStorage.getItem('selected_local_model');
        if (storedModel) {
          queryPayload.model = storedModel;
        }
      }

      if (sessionId) {
        queryPayload.session_id = sessionId;
      }

      // --- SSE Streaming Request ---
      const response = await fetch("/api/proxy/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep the incomplete tail

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const rawJson = line.slice(6); // strip "data: "

          try {
            const event = JSON.parse(rawJson);

            if (event.type === "session") {
              // First event: set session ID and sources
              if (!sessionId && event.session_id) {
                setSessionId(event.session_id);
                if (typeof window !== "undefined") {
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set("session", event.session_id);
                  window.history.replaceState({}, "", newUrl.toString());
                }
              }
              // Attach sources to the placeholder message
              if (event.sources?.length > 0) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, sources: event.sources }
                      : m
                  )
                );
              }
            } else if (event.type === "token") {
              // Append token text to the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + event.text }
                    : m
                )
              );
            } else if (event.type === "suggestions") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, suggestions: event.prompts }
                    : m
                )
              );
            } else if (event.type === "done") {
              // Mark streaming as complete
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, isStreaming: false }
                    : m
                )
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `❌ AI Error: ${event.message}`,
                        isStreaming: false,
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }
    } catch (error) {
      console.error("Chat stream error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: "❌ Oops... There was an error connecting to the AI engine.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setIsProcessingFiles(false);
      isQueryingRef.current = false;
    }
  };

  return {
    messages,
    isLoading,
    isProcessingFiles,
    submitQuery,
    sessionId,
    activeSpaceId,
    setActiveSpaceId,
  };
}
