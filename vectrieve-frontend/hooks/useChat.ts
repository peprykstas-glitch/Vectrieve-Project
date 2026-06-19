import React, { useState } from "react";
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
}

export function useChat(computeMode: string, aiPersona: string, initialSessionId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId || undefined)

  // Fetch history if we have an initial session
  React.useEffect(() => {
    if (initialSessionId) {
      setIsLoading(true)
      apiClient<any>(`/sessions/${initialSessionId}`)
        .then(data => {
          if (data && data.messages) {
            setMessages(data.messages.map((m: any) => ({
              id: m.id.toString(),
              role: m.role,
              content: m.content
            })))
          }
        })
        .catch(err => console.error("Failed to load chat history:", err))
        .finally(() => setIsLoading(false))
    } else {
      setMessages([{
        id: "1",
        role: "assistant",
        content: "Hello. I am Vectrieve Core. How can I assist with your data analysis today?",
      }])
    }
  }, [initialSessionId])

  const submitQuery = async (queryText: string, attachedFiles: File[]) => {
    if (!queryText.trim() && attachedFiles.length === 0 && !isLoading) return;

    const fileNames = attachedFiles.map((f) => f.name);
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: queryText.trim(),
      attachedFiles: fileNames.length > 0 ? fileNames : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Parallel uploads
      if (attachedFiles.length > 0) {
        await Promise.all(attachedFiles.map(async (file) => {
          const fileData = new FormData();
          fileData.append("file", file);
          return apiClient("/upload", {
            method: "POST",
            body: fileData,
          });
        }));
      }

      const queryPayloadBody: any = {
        messages: [{ role: "user", content: queryText }],
        thinking_mode: aiPersona, 
        mode: computeMode, 
      };
      
      if (sessionId) {
        queryPayloadBody.session_id = sessionId;
      }

      const data = await apiClient<any>("/chat/query", {
        method: "POST",
        body: JSON.stringify(queryPayloadBody),
      });

      const assistantText = data.response_text || "No response text found.";
      const sources = data.sources || [];
      const assistantMsgId = (Date.now() + 1).toString();
      
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        // Optionally update URL without reload
        if (typeof window !== 'undefined') {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('session', data.session_id);
          window.history.replaceState({}, '', newUrl.toString());
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: assistantText, sources }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "❌ Oops... There was an error connecting to the AI engine." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    submitQuery
  };
}
