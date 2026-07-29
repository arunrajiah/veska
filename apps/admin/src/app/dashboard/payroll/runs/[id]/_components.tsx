'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export function ProcessRunButton({ runId, status }: { runId: string; status: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  if (status !== 'draft') return null;

  async function handleProcess() {
    setLoading(true);
    try {
      await fetch(`/api/veska/payroll/runs/${runId}/process`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleProcess()}
      disabled={loading}
      className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Processing…' : 'Process Run'}
    </button>
  );
}

export function DownloadCSVButton({ runId, payslips }: { runId: string; payslips: Array<{ employeeName?: string; grossPay?: number; tax?: number; netPay?: number; status?: string }> }) {
  function handleDownload() {
    const rows = [
      ['Employee', 'Gross Pay', 'Tax', 'Net Pay', 'Status'],
      ...payslips.map((p) => [
        p.employeeName ?? '',
        String(p.grossPay ?? 0),
        String(p.tax ?? 0),
        String(p.netPay ?? 0),
        p.status ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-run-${runId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Download CSV
    </button>
  );
}
