const API_URL = 'http://localhost:8000';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  latency?: number;
  query_id?: string;
  last_query?: string;
  mode_used?: string;
  timestamp?: string; // Додали таймстемп
}

export interface Session {
  id: string;
  preview: string;
  timestamp: string;
}

export interface Source {
  filename: string;
  content: string;
  score: number;
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return { status: "error" };
  }
}

// 👇 Оновлено: приймає session_id
export async function sendMessage(
    messages: Message[], 
    thinking_mode: string, 
    mode: 'cloud' | 'local',
    session_id: string | null // <--- Важливо!
) {
  const response = await fetch(`${API_URL}/chat/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        messages, 
        thinking_mode, 
        mode,
        session_id // Відправляємо ID на сервер
    }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
}

// --- НОВІ МЕТОДИ ДЛЯ СЕСІЙ ---

export async function getSessions(): Promise<Session[]> {
    const response = await fetch(`${API_URL}/sessions/`);
    if (!response.ok) return [];
    return response.json();
}

export async function getSessionMessages(session_id: string): Promise<Message[]> {
    const response = await fetch(`${API_URL}/sessions/${session_id}/messages`);
    if (!response.ok) return [];
    return response.json();
}

export async function deleteSession(session_id: string) {
    await fetch(`${API_URL}/sessions/${session_id}`, {
        method: 'DELETE'
    });
}
// -----------------------------

export async function getAnalytics() {
  try {
    const res = await fetch(`${API_URL}/analytics/analytics`);
    return res.json();
  } catch (error) {
    console.error("Analytics failed:", error);
    return null;
  }
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_URL}/upload/`, { method: 'POST', body: formData });
  return response.json();
}

export async function getFiles() {
  const response = await fetch(`${API_URL}/upload/files`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.files || [];
}

export async function deleteFile(filename: string) {
  await fetch(`${API_URL}/upload/delete_file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
}

export async function sendFeedback(data: any) {
  await fetch(`${API_URL}/chat/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}