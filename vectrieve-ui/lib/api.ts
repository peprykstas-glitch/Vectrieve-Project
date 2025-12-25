const API_URL = 'http://localhost:8000'; // Або твоя IP адреса, якщо запускаєш на іншому пристрої

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  latency?: number;
  query_id?: string;
  last_query?: string;
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

// 👇 ОНОВЛЕНА ФУНКЦІЯ: Тепер приймає mode
export async function sendMessage(messages: Message[], temperature: number, mode: 'cloud' | 'local') {
  const response = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        messages, 
        temperature,
        mode // <--- Передаємо режим на бекенд
    }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
}

export async function getAnalytics() {
  try {
    const res = await fetch(`${API_URL}/analytics`);
    return res.json();
  } catch (error) {
    console.error("Analytics failed:", error);
    return null;
  }
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function getFiles() {
  const response = await fetch(`${API_URL}/files`);
  return response.json().then((data) => data.files || []);
}

export async function deleteFile(filename: string) {
  await fetch(`${API_URL}/delete_file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
}

export async function sendFeedback(data: { query_id: string; feedback: 'positive' | 'negative'; query: string; response: string; latency: number }) {
  await fetch(`${API_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}