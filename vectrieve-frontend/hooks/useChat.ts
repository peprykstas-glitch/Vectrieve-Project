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
  initialSessionId?: string | null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(
    initialSessionId || undefined
  );
  const isQueryingRef = useRef(false);

  // --- Load chat history if we're restoring an existing session ---
  React.useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      setIsLoading(true);
      apiClient<any>(`/sessions/${initialSessionId}`)
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
  }, [initialSessionId]);

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
      // Upload any attached files first (in parallel)
      if (attachedFiles.length > 0) {
        await Promise.all(
          attachedFiles.map(async (file) => {
            const fileData = new FormData();
            fileData.append("file", file);
            return apiClient("/upload", {
              method: "POST",
              body: fileData,
            });
          })
        );
      }

      const queryPayload: any = {
        messages: [{ role: "user", content: queryText }],
        thinking_mode: aiPersona,
        mode: computeMode,
      };

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
      isQueryingRef.current = false;
    }
  };

  return {
    messages,
    isLoading,
    submitQuery,
    sessionId,
  };
}
