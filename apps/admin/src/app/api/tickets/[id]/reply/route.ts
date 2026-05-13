import { type NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;
  const body = await req.json() as Record<string, unknown>;

  const res = await fetch(`${API_BASE}/api/v1/support/tickets/${id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Veska-Tenant-Id': tenantId,
      'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
