import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

// Authenticated catch-all proxy to the Veska API.
//
// Client components cannot authenticate against the API themselves: the session
// token lives in an HttpOnly cookie by design, so browser code can never read it to
// build an Authorization header. Routing their calls through this same-origin proxy
// is what makes them work, and it means tenant and identity come from the session
// rather than from client-supplied headers that could be forged or simply wrong.
export const dynamic = 'force-dynamic';

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('veska_session')?.value;
  const identityId = cookieStore.get('veska_identity')?.value;
  const tenantId = cookieStore.get('veska_tenant')?.value;

  if (!sessionToken || !identityId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.search;
  const target = `${API_BASE}/api/v1/${path.map(encodeURIComponent).join('/')}${search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${sessionToken}`,
    'X-Veska-Identity-Id': identityId,
    Accept: req.headers.get('accept') ?? 'application/json',
  };
  if (tenantId) headers['X-Veska-Tenant-Id'] = tenantId;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  if (hasBody) {
    headers['Content-Type'] = req.headers.get('content-type') ?? 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      signal: req.signal,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'API unreachable' }, { status: 502 });
  }

  // Pass the upstream response through untouched so callers see real status codes.
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('Content-Type', contentType);
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
