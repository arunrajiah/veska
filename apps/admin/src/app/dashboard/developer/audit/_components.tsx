'use client';

import { useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import type { AuditLog } from './page.js';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  viewed: 'bg-gray-100 text-gray-600',
  exported: 'bg-purple-100 text-purple-700',
  imported: 'bg-indigo-100 text-indigo-700',
};

function exportCsv(logs: AuditLog[]) {
  const header = 'Timestamp,User,Action,Resource Type,Resource ID,IP Address';
  const rows = logs.map((l) => {
    const d = l.data;
    const ts = d.timestamp ? new Date(d.timestamp).toLocaleString() : '';
    const escape = (s?: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    return [
      escape(ts),
      escape(d.userName ?? d.userId),
      escape(d.action),
      escape(d.resourceType),
      escape(d.resourceId),
      escape(d.ipAddress),
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AuditLogClient({ logs }: { logs: AuditLog[] }) {
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const uniqueActions = Array.from(
    new Set(logs.map((l) => l.data.action).filter(Boolean)),
  ) as string[];

  const filtered = logs.filter((l) => {
    const d = l.data;
    if (actionFilter && d.action !== actionFilter) return false;
    const ts = d.timestamp ? new Date(d.timestamp) : null;
    if (dateFrom && ts && ts < new Date(dateFrom)) return false;
    if (dateTo && ts && ts > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all actions across your tenant</p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {(actionFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setActionFilter('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} events</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No audit events found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Resource Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Resource ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const d = log.data;
                const action = d.action ?? '';
                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {d.timestamp ? new Date(d.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{d.userName ?? '—'}</div>
                      {d.userId && d.userId !== d.userName && (
                        <div className="text-xs text-gray-400 font-mono">{d.userId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{d.resourceType ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-gray-500">
                        {d.resourceId ? d.resourceId.slice(0, 12) + '…' : '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">
                      {d.ipAddress ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
