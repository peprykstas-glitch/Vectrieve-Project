import { useState, useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";

export interface Document {
  id: number;
  filename: string;
  file_size?: number;
  chunk_count?: number;
  upload_timestamp: string;
  status: string;
  summary?: string;
  error_log?: string;
}

export function useFiles() {
  const [files, setFiles] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const spaceId = searchParams.get('space');

  const fetchFiles = async () => {
    try {
      const query = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : '';
      const data = await apiClient<Document[]>(`/upload${query}`);
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = async () => {
      try {
        const res = await fetch('/api/ws-token');
        if (!res.ok) return;
        const { token } = await res.json();
        
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const wsBase = apiBase.replace(/^http/, 'ws');
        ws = new WebSocket(`${wsBase}/ws?token=${token}`);
        
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'file_status') {
              setFiles((prev) => 
                prev.map((f) => 
                  f.id === msg.doc_id 
                    ? { 
                        ...f, 
                        status: msg.status, 
                        error_log: msg.error || f.error_log, 
                        chunk_count: msg.chunk_count !== undefined ? msg.chunk_count : f.chunk_count,
                        file_size: msg.file_size !== undefined ? msg.file_size : f.file_size
                      }
                    : f
                )
              );
            }
          } catch (e) {
            console.error("WS parse error", e);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
      } catch (err) {
        console.error("Failed to setup WebSocket", err);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [spaceId]);

  // Intelligent polling fallback: if any file is processing (e.g. over ngrok where local WS might be unreachable)
  useEffect(() => {
    const hasProcessing = files.some(f => f.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchFiles();
    }, 4000);

    return () => clearInterval(interval);
  }, [files]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append('file', file);
        if (spaceId) {
          formData.append('space_id', spaceId);
        }
        
        await apiClient('/upload', {
          method: 'POST',
          body: formData,
        });
      }
      await fetchFiles();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Error uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient(`/upload/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("Failed to delete file", error);
      alert("Error deleting file.");
      throw error;
    }
  };

  const handleReindex = async (id: number) => {
    try {
      // Set the document status locally to PROCESSING immediately for instant visual response
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'PROCESSING' } : f));
      await apiClient(`/upload/${id}/reindex`, { method: 'POST' });
    } catch (error) {
      console.error("Failed to reindex file", error);
      alert("Error re-indexing file.");
      throw error;
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  return {
    files,
    filteredFiles,
    isLoading,
    isUploading,
    searchQuery,
    setSearchQuery,
    fileInputRef,
    handleFileUpload,
    handleDelete,
    handleReindex
  };
}
