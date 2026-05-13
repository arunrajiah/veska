import AIChatShell from './_chat';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

async function getConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch(
      'http://localhost:3001/api/v1/ai/conversations?tenantId=demo',
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations ?? data ?? [];
  } catch {
    return [];
  }
}

export default async function AIPage() {
  const conversations = await getConversations();
  return <AIChatShell initialConversations={conversations} />;
}
