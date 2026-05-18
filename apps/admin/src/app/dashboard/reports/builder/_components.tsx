'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Save, ChevronLeft, Plus, X, Download, ArrowUpDown } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type EntityType = 'Invoice' | 'Expense' | 'Employee' | 'Contact' | 'Ticket' | 'Project' | 'Deal';
type ChartType = 'table' | 'bar' | 'line' | 'pie';
type Operator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max';

interface FilterRow {
  field: string;
  operator: Operator;
  value: string;
}

interface ReportDefinition {
  entityType: string;
  fields: string[];
  filters: FilterRow[];
  groupBy?: string;
  aggregation?: Aggregation;
  aggregationField?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
}

interface RunResult {
  columns: string[];
  rows: unknown[][];
  total: number;
  executionMs: number;
}

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ENTITY_TYPES: EntityType[] = [
  'Invoice', 'Expense', 'Employee', 'Contact', 'Ticket', 'Project', 'Deal',
];

const ENTITY_FIELDS: Record<EntityType, string[]> = {
  Invoice:  ['number', 'customerName', 'amount', 'status', 'dueDate', 'issuedAt', 'currency'],
  Expense:  ['title', 'amount', 'category', 'status', 'date', 'submittedBy'],
  Employee: ['name', 'department', 'role', 'salary', 'startDate'],
  Contact:  ['name', 'email', 'company', 'status'],
  Ticket:   ['title', 'status', 'priority', 'assignee', 'createdAt'],
  Project:  ['name', 'status', 'budget', 'startDate', 'endDate', 'manager'],
  Deal:     ['title', 'value', 'stage', 'contact', 'closedAt', 'probability'],
};

const ENTITY_GROUP_FIELDS: Record<EntityType, string[]> = {
  Invoice:  ['status', 'currency', 'customerName', 'issuedAt'],
  Expense:  ['category', 'status', 'submittedBy'],
  Employee: ['department', 'role', 'status'],
  Contact:  ['company', 'status'],
  Ticket:   ['status', 'priority', 'assignee'],
  Project:  ['status', 'manager'],
  Deal:     ['stage', 'contact'],
};

const OPERATORS: Array<{ value: Operator; label: string }> = [
  { value: 'eq',       label: 'equals' },
  { value: 'neq',      label: 'not equals' },
  { value: 'gt',       label: 'greater than' },
  { value: 'lt',       label: 'less than' },
  { value: 'gte',      label: '>=' },
  { value: 'lte',      label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'in',       label: 'in (comma-sep)' },
];

const AGGREGATIONS: Aggregation[] = ['count', 'sum', 'avg', 'min', 'max'];
const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa'];

function tenantHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' };
}

// ─────────────────────────────────────────────────────────────
// Simple SVG Charts
// ─────────────────────────────────────────────────────────────

function BarChart({ labels, values, color = '#6366f1' }: { labels: string[]; values: number[]; color?: string }) {
  if (!labels.length) return null;
  const max = Math.max(...values, 1);
  const barHeight = 24;
  const gap = 6;
  const labelWidth = 120;
  const chartWidth = 300;
  const height = labels.length * (barHeight + gap);

  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 60} ${height + 10}`} className="overflow-visible">
      {labels.map((label, i) => {
        const y = i * (barHeight + gap);
        const barW = (values[i]! / max) * chartWidth;
        return (
          <g key={i} transform={`translate(0, ${y})`}>
            <text x={labelWidth - 6} y={barHeight / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280" className="truncate">
              {label.length > 14 ? label.slice(0, 14) + '…' : label}
            </text>
            <rect x={labelWidth} y={0} width={Math.max(barW, 2)} height={barHeight} rx={3} fill={color} opacity={0.85} />
            <text x={labelWidth + barW + 6} y={barHeight / 2 + 4} fontSize="11" fill="#374151">
              {typeof values[i] === 'number' ? Number(values[i]).toLocaleString() : values[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ labels, values }: { labels: string[]; values: number[] }) {
  if (labels.length < 2) return null;
  const w = 460;
  const h = 160;
  const padX = 40;
  const padY = 20;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  function px(i: number) {
    return padX + (i / (labels.length - 1)) * (w - padX * 2);
  }
  function py(v: number) {
    return padY + (1 - (v - min) / range) * (h - padY * 2);
  }

  const points = values.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 30}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padY + t * (h - padY * 2);
        return <line key={t} x1={padX} y1={y} x2={w - padX} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      {/* Line */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {values.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r={3} fill="#6366f1" />
      ))}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={px(i)} y={h + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {l.length > 8 ? l.slice(0, 8) + '…' : l}
        </text>
      ))}
    </svg>
  );
}

function PieChart({ labels, values }: { labels: string[]; values: number[] }) {
  if (!labels.length) return null;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 100;
  const cy = 100;
  const r = 80;

  let startAngle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const angle = (v / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = startAngle + angle / 2;
    const lx = cx + (r + 20) * Math.cos(midAngle);
    const ly = cy + (r + 20) * Math.sin(midAngle);
    const slice = { x1, y1, x2, y2, largeArc, lx, ly, color: CHART_COLORS[i % CHART_COLORS.length]!, pct: Math.round((v / total) * 100), label: labels[i]! };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map((s, i) => (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2} Z`}
            fill={s.color}
            opacity={0.85}
          />
        ))}
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 truncate max-w-[120px]">{s.label}</span>
            <span className="text-gray-400 ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Preview Panel
// ─────────────────────────────────────────────────────────────

function PreviewPanel({
  result,
  loading,
  chartType,
  onRun,
  onExportCsv,
}: {
  result: RunResult | null;
  loading: boolean;
  chartType: ChartType;
  onRun: () => void;
  onExportCsv: () => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  if (loading) {
    return (
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">Preview</span>
        </div>
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Running…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">Preview</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Play size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400">Configure your report and click Run</p>
          <button
            onClick={onRun}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Run Report
          </button>
        </div>
      </div>
    );
  }

  const { columns, rows, total, executionMs } = result;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  // Derive chart data from first two columns
  const labelCol = 0;
  const valueCol = columns.length > 1 ? 1 : 0;
  const chartLabels = rows.map((r) => String((r as unknown[])[labelCol] ?? ''));
  const chartValues = rows.map((r) => Number((r as unknown[])[valueCol] ?? 0));

  return (
    <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Preview</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Play size={12} /> Re-run
          </button>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Ran in {executionMs}ms · {total} row{total !== 1 ? 's' : ''}
      </p>

      <div className="flex-1 min-h-0 overflow-auto">
        {total === 0 ? (
          <div className="flex items-center justify-center h-24 border border-gray-100 rounded-xl bg-gray-50">
            <p className="text-sm text-gray-400">No results found.</p>
          </div>
        ) : chartType === 'table' ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {columns.map((col) => (
                    <th key={col} className="text-left px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    {(row as unknown[]).map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700 font-mono whitespace-nowrap">
                        {cell === null || cell === undefined ? (
                          <span className="text-gray-300">—</span>
                        ) : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : chartType === 'bar' ? (
          <div className="p-3 border border-gray-200 rounded-xl bg-white">
            <BarChart labels={chartLabels} values={chartValues} />
          </div>
        ) : chartType === 'line' ? (
          <div className="p-3 border border-gray-200 rounded-xl bg-white">
            <LineChart labels={chartLabels} values={chartValues} />
          </div>
        ) : (
          <div className="p-3 border border-gray-200 rounded-xl bg-white">
            <PieChart labels={chartLabels} values={chartValues} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Save Modal
// ─────────────────────────────────────────────────────────────

function SaveModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Save Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Report name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Invoice Summary"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="What does this report show?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, desc)}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Report Builder Client
// ─────────────────────────────────────────────────────────────

export function ReportBuilderClient({ initialSavedReports }: { initialSavedReports: SavedReport[] }) {
  const router = useRouter();

  // Definition state
  const [entityType, setEntityType] = useState<EntityType>('Invoice');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ENTITY_FIELDS['Invoice'].slice(0, 4)));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [aggregation, setAggregation] = useState<Aggregation>('count');
  const [aggregationField, setAggregationField] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number | 'all'>(50);
  const [chartType, setChartType] = useState<ChartType>('table');

  // Run state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState('');

  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(initialSavedReports);
  const [saveSuccess, setSaveSuccess] = useState('');

  // ── Entity type change ───────────────────────────────────
  function handleEntityChange(et: EntityType) {
    setEntityType(et);
    setSelectedFields(new Set(ENTITY_FIELDS[et].slice(0, 4)));
    setGroupBy('');
    setFilters([]);
    setOrderBy('');
    setResult(null);
  }

  // ── Field toggle ─────────────────────────────────────────
  function toggleField(f: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  // ── Filters ──────────────────────────────────────────────
  function addFilter() {
    const firstField = ENTITY_FIELDS[entityType][0] ?? '';
    setFilters((prev) => [...prev, { field: firstField, operator: 'eq', value: '' }]);
  }
  function updateFilter(i: number, patch: Partial<FilterRow>) {
    setFilters((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFilter(i: number) {
    setFilters((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Run ──────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setLoading(true);
    setRunError('');
    setResult(null);

    const def: ReportDefinition = {
      entityType,
      fields: Array.from(selectedFields),
      filters: filters.filter((f) => f.field && f.value !== ''),
      orderDir,
      limit: limit === 'all' ? 1000 : limit,
      ...(groupBy ? { groupBy } : {}),
      ...(groupBy ? { aggregation } : {}),
      ...(groupBy && aggregationField ? { aggregationField } : {}),
      ...(orderBy ? { orderBy } : {}),
    };

    try {
      const res = await fetch(`${API_BASE}/reports/run`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify(def),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setRunError(d.error ?? 'Run failed');
        return;
      }
      const data = (await res.json()) as RunResult;
      setResult(data);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setLoading(false);
    }
  }, [entityType, selectedFields, filters, groupBy, aggregation, aggregationField, orderBy, orderDir, limit]);

  // ── Save ─────────────────────────────────────────────────
  async function handleSave(name: string, description: string) {
    setSaving(true);
    const config = {
      entityType,
      fields: Array.from(selectedFields),
      filters,
      groupBy,
      aggregation,
      aggregationField,
      orderBy,
      orderDir,
      limit,
      chartType,
    };
    try {
      const res = await fetch(`${API_BASE}/reports/saved`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ name, description, config }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setRunError(d.error ?? 'Save failed');
        return;
      }
      const saved = (await res.json()) as SavedReport;
      setSavedReports((prev) => [saved, ...prev]);
      setShowSaveModal(false);
      setSaveSuccess(`Saved "${name}"`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch {
      setRunError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Load saved ───────────────────────────────────────────
  function loadSaved(report: SavedReport) {
    const cfg = report.config as Partial<ReportDefinition & { chartType: ChartType }> | undefined;
    if (!cfg) return;
    if (cfg.entityType && ENTITY_TYPES.includes(cfg.entityType as EntityType)) {
      setEntityType(cfg.entityType as EntityType);
    }
    if (cfg.fields) setSelectedFields(new Set(cfg.fields));
    if (cfg.filters) setFilters(cfg.filters as FilterRow[]);
    setGroupBy(cfg.groupBy ?? '');
    if (cfg.aggregation) setAggregation(cfg.aggregation);
    setAggregationField(cfg.aggregationField ?? '');
    setOrderBy(cfg.orderBy ?? '');
    if (cfg.orderDir) setOrderDir(cfg.orderDir);
    if (cfg.limit) setLimit(cfg.limit);
    if (cfg.chartType) setChartType(cfg.chartType);
    setResult(null);
  }

  // ── Export CSV ────────────────────────────────────────────
  function handleExportCsv() {
    if (!result) return;
    function escape(v: unknown): string {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }
    const lines = [
      result.columns.map(escape).join(','),
      ...result.rows.map((r) => (r as unknown[]).map(escape).join(',')),
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const availableFields = ENTITY_FIELDS[entityType];
  const groupFields = ENTITY_GROUP_FIELDS[entityType];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/reports')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            Reports
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-base font-semibold text-gray-900">Report Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-medium">{saveSuccess}</span>
          )}
          <button
            onClick={() => void handleRun()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> {loading ? 'Running…' : 'Run'}
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {runError && (
        <div className="mx-6 mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="flex-1">{runError}</span>
          <button onClick={() => setRunError('')}><X size={14} /></button>
        </div>
      )}

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Col 1: Data Source ── */}
        <div className="w-52 shrink-0 border-r border-gray-200 flex flex-col overflow-y-auto bg-gray-50/50">
          {/* Saved reports sidebar */}
          {savedReports.length > 0 && (
            <div className="border-b border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Saved</p>
              <div className="space-y-1">
                {savedReports.slice(0, 8).map((sr) => (
                  <button
                    key={sr.id}
                    onClick={() => loadSaved(sr)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 truncate transition-colors"
                  >
                    {sr.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 space-y-4 flex-1">
            {/* Entity types */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Source</p>
              <div className="space-y-1">
                {ENTITY_TYPES.map((et) => (
                  <label key={et} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="entityType"
                      checked={entityType === et}
                      onChange={() => handleEntityChange(et)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{et}s</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Group by */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Group by</p>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {groupFields.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {groupBy && (
                <div className="mt-2 space-y-1.5">
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as Aggregation)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {AGGREGATIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {aggregation !== 'count' && (
                    <select
                      value={aggregationField}
                      onChange={(e) => setAggregationField(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Pick field…</option>
                      {availableFields.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Chart type */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Chart type</p>
              <div className="space-y-1">
                {(['table', 'bar', 'line', 'pie'] as ChartType[]).map((ct) => (
                  <label key={ct} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="chartType"
                      checked={chartType === ct}
                      onChange={() => setChartType(ct)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {ct === 'table' ? 'Table' : ct === 'bar' ? 'Bar chart' : ct === 'line' ? 'Line chart' : 'Pie chart'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Col 2: Fields & Filters ── */}
        <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col overflow-y-auto bg-white">
          <div className="p-4 space-y-5">
            {/* Fields */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fields</p>
              <div className="space-y-1">
                {availableFields.map((f) => (
                  <label key={f} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.has(f)}
                      onChange={() => toggleField(f)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</p>
                <button
                  onClick={addFilter}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <Plus size={12} /> Add filter
                </button>
              </div>
              {filters.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2">No filters — all records included</p>
              ) : (
                <div className="space-y-2">
                  {filters.map((f, i) => (
                    <div key={i} className="flex flex-col gap-1.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={f.field}
                          onChange={(e) => updateFilter(i, { field: e.target.value })}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          {availableFields.map((af) => (
                            <option key={af} value={af}>{af}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeFilter(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <select
                        value={f.operator}
                        onChange={(e) => updateFilter(i, { operator: e.target.value as Operator })}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => updateFilter(i, { value: e.target.value })}
                        placeholder="Value"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort by</p>
              <div className="flex gap-2">
                <select
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Default</option>
                  {availableFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  onClick={() => setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ArrowUpDown size={12} />
                  {orderDir === 'asc' ? 'Asc' : 'Desc'}
                </button>
              </div>
            </div>

            {/* Limit */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Limit</p>
              <select
                value={limit === 'all' ? 'all' : String(limit)}
                onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All (up to 1000)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Col 3: Preview ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
          <PreviewPanel
            result={result}
            loading={loading}
            chartType={chartType}
            onRun={() => void handleRun()}
            onExportCsv={handleExportCsv}
          />
        </div>
      </div>

      {showSaveModal && (
        <SaveModal
          onClose={() => setShowSaveModal(false)}
          onSave={(name, desc) => void handleSave(name, desc)}
          saving={saving}
        />
      )}
    </div>
  );
}
