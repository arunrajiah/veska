'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'demo-tenant',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type InsightPriority = 'high' | 'medium' | 'low';
type InsightFocus = 'finance' | 'hr' | 'sales' | 'ops';

interface Insight {
  id?: string;
  text: string;
  priority: InsightPriority;
  module: string;
}

interface InsightsResponse {
  insights: Insight[];
}

// ─── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<InsightPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

function PriorityBadge({ priority }: { priority: InsightPriority }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {priority}
    </span>
  );
}

// ─── AI Insights Widget ────────────────────────────────────────────────────────

const FOCUS_OPTIONS: { key: InsightFocus; label: string }[] = [
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR' },
  { key: 'sales', label: 'Sales' },
  { key: 'ops', label: 'Ops' },
];

export function AIInsightsWidget() {
  const [focus, setFocus] = useState<InsightFocus>('finance');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (f: InsightFocus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<InsightsResponse>('/api/v1/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ focus: f }),
      });
      setInsights(Array.isArray(data.insights) ? data.insights : []);
      setFetched(true);
    } catch {
      setError('AI insights unavailable');
      setInsights([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFocusChange = useCallback(
    (f: InsightFocus) => {
      setFocus(f);
      if (fetched) {
        fetchInsights(f);
      }
    },
    [fetched, fetchInsights],
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">AI Insights</h2>
        </div>

        {/* Focus pills */}
        <div className="flex items-center gap-1">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleFocusChange(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                focus === opt.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {!fetched && !loading && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => fetchInsights(focus)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Sparkles size={14} />
            Get AI Insights
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-indigo-600">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Generating insights…</span>
        </div>
      )}

      {fetched && !loading && error && (
        <p className="text-sm text-gray-400 text-center py-4">{error}</p>
      )}

      {fetched && !loading && !error && insights.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No insights available.</p>
      )}

      {fetched && !loading && !error && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div
              key={insight.id ?? i}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-relaxed">{insight.text}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <PriorityBadge priority={insight.priority} />
                {insight.module && (
                  <span className="text-xs text-gray-400 capitalize">{insight.module}</span>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => fetchInsights(focus)}
            className="w-full text-xs text-indigo-500 hover:text-indigo-700 py-1 transition-colors"
          >
            Refresh insights
          </button>
        </div>
      )}
    </div>
  );
}
