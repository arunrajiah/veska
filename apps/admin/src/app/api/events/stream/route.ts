import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

// EventSource cannot set an Authorization header and the session cookie is HttpOnly,
// so the browser can never authenticate against the API directly. Proxy the stream
// from this origin, where the cookie is readable, and attach the headers the API's
// requireSession() and tenantContext() middleware expect.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('veska_session')?.value;
  const identityId = cookieStore.get('veska_identity')?.value;
  const tenantId = cookieStore.get('veska_tenant')?.value;

  if (!sessionToken || !identityId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/sse/stream`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${sessionToken}`,
        'X-Veska-Identity-Id': identityId,
        ...(tenantId ? { 'X-Veska-Tenant-Id': tenantId } : {}),
      },
      // Propagate client disconnect so the upstream stream and its subscriber close.
      signal: req.signal,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Event stream unavailable' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: 'Event stream unavailable' },
      { status: upstream.status === 200 ? 502 : upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
