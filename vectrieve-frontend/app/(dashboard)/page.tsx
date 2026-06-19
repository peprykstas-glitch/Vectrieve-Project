import { ChatArea } from "@/components/chat/ChatArea";

export const metadata = {
  title: "Workspace | Vectrieve",
  description: "Secure RAG environment",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const sessionId = typeof params.session === 'string' ? params.session : null;
  
  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <ChatArea initialSessionId={sessionId} />
    </div>
  );
}