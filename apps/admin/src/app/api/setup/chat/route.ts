import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('veska_session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, history } = (await req.json()) as {
    message: string;
    history: Array<{ role: string; content: string }>;
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  };

  // Forward to the core API config propose endpoint which uses the ConfigAgent
  const res = await fetch(`${API_BASE}/api/v1/config/propose`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ request: message, conversationHistory: history }),
  });

  if (!res.ok) {
    return NextResponse.json({ reply: 'Setup service unavailable. Please try again.' });
  }

  const data = (await res.json()) as {
    diff: unknown;
    summary: string;
    diffId: string;
  };

  // If there's a diff, acknowledge and ask for confirmation
  const hasDiff = data.diff && Object.keys(data.diff as object).length > 0;
  const reply = hasDiff
    ? `${data.summary}\n\nShall I apply this setup? Reply "yes" to confirm or describe any changes you'd like.`
    : data.summary;

  // Check if user said yes to apply
  const lowerMsg = message.toLowerCase().trim();
  if ((lowerMsg === 'yes' || lowerMsg === 'looks good' || lowerMsg === 'apply') && data.diffId) {
    await fetch(`${API_BASE}/api/v1/config/apply/${data.diffId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    return NextResponse.json({
      reply: "Your workspace is ready. Taking you to the dashboard...",
      done: true,
    });
  }

  return NextResponse.json({ reply, done: false });
}
