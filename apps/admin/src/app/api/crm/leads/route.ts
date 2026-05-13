import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.VESKA_TENANT_ID ?? '';
const IDENTITY_ID = process.env.VESKA_ADMIN_IDENTITY_ID ?? '';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_BASE}/api/v1/crm/leads`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
