'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Edit2, Trophy, X, ChevronLeft, ChevronRight, Wand2, Loader2, Link2, Copy, Mail } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_VESKA_TENANT_ID ?? 'demo';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function formatCurrency(value?: number): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  name: string;
  color?: string;
  order?: number;
  probability?: number;
}

interface Deal {
  id: string;
  stageId?: string;
  stage?: string;
  title?: string;
  contactName?: string;
  value?: number;
  closeDate?: string;
  owner?: string;
  status?: 'open' | 'won' | 'lost';
  data?: {
    name?: string;
    value?: number;
    close_date?: string;
    company_id?: string;
    contact_name?: string;
    owner?: string;
    status?: string;
    stage_id?: string;
  };
}

interface Contact {
  id: string;
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    tags?: string[];
    notes?: string;
  };
  dealsCount?: number;
  deals?: Deal[];
}

interface PipelineStageSummary {
  count: number;
  totalValue: number;
  deals?: Deal[];
}

type PipelineResponse = Record<string, PipelineStageSummary>;

// ─── Stage dot color helper ───────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-gray-400',
  qualification: 'bg-blue-500',
  proposal: 'bg-indigo-500',
  negotiation: 'bg-yellow-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-400',
};

const STAGE_COLUMN_BG: Record<string, string> = {
  prospecting: 'bg-gray-50',
  qualification: 'bg-blue-50',
  proposal: 'bg-indigo-50',
  negotiation: 'bg-yellow-50',
  closed_won: 'bg-green-50',
  closed_lost: 'bg-red-50',
};

const DEFAULT_STAGES: Stage[] = [
  { id: 'prospecting', name: 'Prospecting', color: '#9ca3af', order: 1, probability: 10 },
  { id: 'qualification', name: 'Qualification', color: '#3b82f6', order: 2, probability: 25 },
  { id: 'proposal', name: 'Proposal', color: '#6366f1', order: 3, probability: 50 },
  { id: 'negotiation', name: 'Negotiation', color: '#eab308', order: 4, probability: 75 },
  { id: 'closed_won', name: 'Won', color: '#22c55e', order: 5, probability: 100 },
  { id: 'closed_lost', name: 'Lost', color: '#ef4444', order: 6, probability: 0 },
];

// ─── Add Deal Mini Form ───────────────────────────────────────────────────────

interface AddDealFormProps {
  stageId: string;
  onSaved: () => void;
  onCancel: () => void;
}

function AddDealForm({ stageId, onSaved, onCancel }: AddDealFormProps) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [contactName, setContactName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/crm-tables/deals', {
        method: 'POST',
        body: JSON.stringify({
          title,
          value: value ? parseFloat(value) : undefined,
          contactName,
          stageId,
          status: 'open',
        }),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to create deal', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-lg p-3 space-y-2 shadow-sm">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Deal title"
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value (USD)"
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <input
        type="text"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        placeholder="Contact name"
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal;
  stages: Stage[];
  onMove: (dealId: string, newStageId: string) => void;
  onStatusChange: (dealId: string, status: 'won' | 'lost') => void;
}

function DealCard({ deal, stages, onMove, onStatusChange }: DealCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = deal.title ?? deal.data?.name ?? '(Unnamed)';
  const contactName = deal.contactName ?? deal.data?.contact_name;
  const value = deal.value ?? deal.data?.value;
  const closeDate = deal.closeDate ?? deal.data?.close_date;
  const owner = deal.owner ?? deal.data?.owner;
  const status = deal.status ?? (deal.data?.status as 'open' | 'won' | 'lost' | undefined) ?? 'open';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    }
    if (showMoveMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm transition-colors ${
        status === 'won'
          ? 'border-green-200 bg-green-50/50'
          : status === 'lost'
          ? 'border-gray-200 bg-gray-50/50 opacity-60'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <p
        className={`text-xs font-medium text-gray-900 mb-1 ${
          status === 'lost' ? 'line-through text-gray-400' : ''
        }`}
      >
        {title}
      </p>

      {contactName && (
        <p className="text-xs text-gray-500 mb-1.5">{contactName}</p>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-900">{formatCurrency(value)}</span>
        {closeDate && (
          <span className="text-xs text-gray-400">{String(closeDate).slice(0, 10)}</span>
        )}
      </div>

      {owner && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center justify-center">
            {getInitials(owner)}
          </span>
          <span className="text-xs text-gray-400">{owner}</span>
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        {status === 'open' && (
          <>
            <button
              onClick={() => onStatusChange(deal.id, 'won')}
              className="flex items-center gap-0.5 text-xs text-green-600 hover:text-green-800 px-1.5 py-0.5 rounded hover:bg-green-50 transition-colors"
            >
              <Trophy size={10} />
              Won
            </button>
            <button
              onClick={() => onStatusChange(deal.id, 'lost')}
              className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
            >
              Lost
            </button>
          </>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMoveMenu((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
          >
            Move
          </button>
          {showMoveMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-36">
              {stages
                .filter((s) => s.id !== (deal.stageId ?? deal.stage ?? deal.data?.stage_id))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onMove(deal.id, s.id);
                      setShowMoveMenu(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function PipelineTab() {
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [pipeline, setPipeline] = useState<PipelineResponse>({});
  const [deals, setDeals] = useState<Deal[]>([]);
  const [addingToStage, setAddingToStage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pipelineRes, dealsRes, stagesRes] = await Promise.allSettled([
        apiFetch<PipelineResponse>('/crm-tables/pipeline'),
        apiFetch<Deal[]>('/crm-tables/deals'),
        apiFetch<Stage[]>('/crm-tables/stages'),
      ]);
      if (pipelineRes.status === 'fulfilled') setPipeline(pipelineRes.value);
      if (dealsRes.status === 'fulfilled') setDeals(Array.isArray(dealsRes.value) ? dealsRes.value : []);
      if (stagesRes.status === 'fulfilled' && Array.isArray(stagesRes.value) && stagesRes.value.length > 0) {
        setStages(stagesRes.value);
      }
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMove = async (dealId: string, newStageId: string) => {
    try {
      await apiFetch(`/crm-tables/deals/${dealId}`, {
        method: 'PUT',
        body: JSON.stringify({ stageId: newStageId }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to move deal', err);
    }
  };

  const handleStatusChange = async (dealId: string, status: 'won' | 'lost') => {
    try {
      await apiFetch(`/crm-tables/deals/${dealId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to update deal status', err);
    }
  };

  // Compute grand totals
  const allOpenDeals = deals.filter((d) => (d.status ?? d.data?.status ?? 'open') === 'open');
  const totalPipelineValue = allOpenDeals.reduce((s, d) => s + (d.value ?? d.data?.value ?? 0), 0);
  const weightedValue = stages.reduce((s, stage) => {
    const stageDeals = allOpenDeals.filter(
      (d) => (d.stageId ?? d.stage ?? d.data?.stage_id) === stage.id,
    );
    const stageValue = stageDeals.reduce((sv, d) => sv + (d.value ?? d.data?.value ?? 0), 0);
    return s + stageValue * ((stage.probability ?? 50) / 100);
  }, 0);

  // Group deals per stage
  const dealsByStage = (stageId: string): Deal[] => {
    // Try pipeline first
    const fromPipeline = pipeline[stageId]?.deals;
    if (fromPipeline && fromPipeline.length > 0) return fromPipeline;
    // Fallback to deals list
    return deals.filter(
      (d) => (d.stageId ?? d.stage ?? d.data?.stage_id) === stageId,
    );
  };

  return (
    <div className="space-y-4">
      {/* Grand totals bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Total Pipeline</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalPipelineValue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Weighted Value</p>
          <p className="text-xl font-semibold text-indigo-700">{formatCurrency(weightedValue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Open Deals</p>
          <p className="text-xl font-semibold text-gray-900">{allOpenDeals.length}</p>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = dealsByStage(stage.id);
          const stageTotalValue = stageDeals.reduce(
            (s, d) => s + (d.value ?? d.data?.value ?? 0),
            0,
          );
          const dotColor = STAGE_COLORS[stage.id] ?? 'bg-indigo-400';
          const colBg = STAGE_COLUMN_BG[stage.id] ?? 'bg-gray-50';

          return (
            <div key={stage.id} className="flex-shrink-0 w-56">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="text-xs font-medium text-gray-700">{stage.name}</span>
                  <span className="text-xs text-gray-400">({stageDeals.length})</span>
                </div>
                {stageTotalValue > 0 && (
                  <span className="text-xs text-gray-400">{formatCurrency(stageTotalValue)}</span>
                )}
              </div>

              <div className={`rounded-xl p-2 min-h-32 space-y-2 ${colBg}`}>
                {stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    stages={stages}
                    onMove={handleMove}
                    onStatusChange={handleStatusChange}
                  />
                ))}

                {addingToStage === stage.id ? (
                  <AddDealForm
                    stageId={stage.id}
                    onSaved={async () => { setAddingToStage(null); await fetchData(); }}
                    onCancel={() => setAddingToStage(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingToStage(stage.id)}
                    className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-2 rounded-lg hover:bg-white/60 transition-colors"
                  >
                    <Plus size={12} />
                    Add deal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contact Slide-Over Form ──────────────────────────────────────────────────

interface ContactFormProps {
  onSaved: () => void;
  onClose: () => void;
  initial?: Partial<Contact['data']> | undefined;
  contactId?: string | undefined;
}

function ContactForm({ onSaved, onClose, initial, contactId }: ContactFormProps) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? '');
  const [lastName, setLastName] = useState(initial?.last_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company,
        title,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes,
      };
      if (contactId) {
        await apiFetch(`/crm-tables/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/crm-tables/contacts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      console.error('Failed to save contact', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-96 bg-white shadow-xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {contactId ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="customer, vip, tech"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Enrich Button ────────────────────────────────────────────────────────────

function EnrichButton({ contactId }: { contactId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleEnrich = useCallback(async () => {
    setState('loading');
    try {
      await apiFetch(`/api/v1/ai/enrich/${contactId}`, { method: 'POST' });
      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [contactId]);

  if (state === 'done') {
    return (
      <span className="text-xs text-green-600 font-medium whitespace-nowrap">
        Enrichment queued ✓
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="text-xs text-red-500 font-medium whitespace-nowrap">
        Enrich failed
      </span>
    );
  }

  return (
    <button
      onClick={handleEnrich}
      disabled={state === 'loading'}
      title="AI Enrich contact"
      className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-indigo-500 hover:text-indigo-700 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      {state === 'loading' ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Wand2 size={12} />
      )}
      {state === 'loading' ? '' : 'Enrich'}
    </button>
  );
}

// ─── Send Portal Link ─────────────────────────────────────────────────────────

type ExpiryOption = { label: string; value: number | null };
const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'Never', value: null },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
];

interface SendPortalLinkModalProps {
  contactId: string;
  email: string;
  onClose: () => void;
}

function SendPortalLinkModal({ contactId, email, onClose }: SendPortalLinkModalProps) {
  const [expiry, setExpiry] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/portal-mgmt/tokens`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          contactId,
          email,
          ...(expiry !== null ? { expiresInDays: expiry } : {}),
        }),
      });
      if (!res.ok) throw new Error('Failed to create portal token');
      const data = (await res.json()) as { id: string; token: string };
      const url = `${window.location.origin}/portal/${data.token}`;
      setPortalUrl(url);
      setTokenId(data.id);
    } catch {
      setError('Failed to create portal link. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    if (!portalUrl) return;
    void navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendEmail = async () => {
    if (!tokenId) return;
    setSendingEmail(true);
    try {
      await fetch(`${API_BASE}/portal-mgmt/tokens/${tokenId}/send-email`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      setEmailSent(true);
    } catch {
      setError('Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Send Portal Access</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!portalUrl ? (
            <>
              <p className="text-sm text-gray-600">
                Send portal access to <span className="font-medium text-gray-900">{email}</span>?
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Link expiry</label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setExpiry(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        expiry === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                onClick={() => void handleCreate()}
                disabled={sending}
                className="w-full bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Creating…' : 'Create Portal Link'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-green-600 font-medium">Portal link created!</p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Portal URL</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-700 truncate flex-1 font-mono">{portalUrl}</p>
                  <button
                    onClick={handleCopy}
                    className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                    title="Copy link"
                  >
                    {copied ? (
                      <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              {!emailSent ? (
                <button
                  onClick={() => void handleSendEmail()}
                  disabled={sendingEmail}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Mail size={14} />
                  {sendingEmail ? 'Sending…' : 'Send email invite'}
                </button>
              ) : (
                <p className="text-xs text-green-600 font-medium text-center">Email invite sent!</p>
              )}

              <button
                onClick={onClose}
                className="w-full text-sm text-gray-500 py-1.5 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contactDeals, setContactDeals] = useState<Record<string, Deal[]>>({});
  const [portalContact, setPortalContact] = useState<{ id: string; email: string } | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const url = debouncedSearch
        ? `/crm-tables/contacts?search=${encodeURIComponent(debouncedSearch)}`
        : '/crm-tables/contacts';
      const res = await apiFetch<Contact[]>(url);
      setContacts(Array.isArray(res) ? res : []);
    } catch {
      setContacts([]);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await apiFetch(`/crm-tables/contacts/${id}`, { method: 'DELETE' });
      await fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
    }
  };

  const handleExpand = async (contact: Contact) => {
    if (expandedId === contact.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contact.id);
    if (!contactDeals[contact.id]) {
      try {
        const deals = await apiFetch<Deal[]>(`/crm-tables/deals?contactId=${contact.id}`);
        setContactDeals((prev) => ({ ...prev, [contact.id]: Array.isArray(deals) ? deals : [] }));
      } catch {
        setContactDeals((prev) => ({ ...prev, [contact.id]: [] }));
      }
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const fullName = [c.data.first_name, c.data.last_name].filter(Boolean).join(' ').toLowerCase();
    return (
      fullName.includes(q) ||
      (c.data.email ?? '').toLowerCase().includes(q) ||
      (c.data.company ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={() => { setEditContact(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          New contact
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filteredContacts.length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">No contacts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deals</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => {
                const d = contact.data;
                const fullName = [d.first_name, d.last_name].filter(Boolean).join(' ');
                const isExpanded = expandedId === contact.id;
                const deals = contactDeals[contact.id] ?? [];

                return (
                  <>
                    <tr
                      key={contact.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleExpand(contact)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{fullName || '—'}</p>
                        {d.phone && <p className="text-xs text-gray-400">{d.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.company ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.title ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(d.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-1.5 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {contact.dealsCount ?? (isExpanded ? deals.length : '—')}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <EnrichButton contactId={contact.id} />
                          <button
                            onClick={() => setPortalContact({ id: contact.id, email: d.email ?? '' })}
                            title="Send portal access"
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                          >
                            <Link2 size={13} />
                          </button>
                          <button
                            onClick={() => { setEditContact(contact); setShowForm(true); }}
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${contact.id}-expanded`} className="bg-indigo-50/30">
                        <td colSpan={7} className="px-6 py-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Deals</p>
                          {deals.length === 0 ? (
                            <p className="text-xs text-gray-400">No deals linked to this contact.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {deals.map((deal) => (
                                <div
                                  key={deal.id}
                                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs"
                                >
                                  <p className="font-medium text-gray-900">
                                    {deal.title ?? deal.data?.name ?? '(Unnamed)'}
                                  </p>
                                  <p className="text-gray-500">{formatCurrency(deal.value ?? deal.data?.value)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ContactForm
          contactId={editContact?.id}
          initial={editContact?.data}
          onClose={() => { setShowForm(false); setEditContact(null); }}
          onSaved={async () => { setShowForm(false); setEditContact(null); await fetchContacts(); }}
        />
      )}

      {portalContact && (
        <SendPortalLinkModal
          contactId={portalContact.id}
          email={portalContact.email}
          onClose={() => setPortalContact(null)}
        />
      )}
    </div>
  );
}

// ─── Main CRM Client ──────────────────────────────────────────────────────────

type Tab = 'pipeline' | 'contacts';

export function CRMClient() {
  const [tab, setTab] = useState<Tab>('pipeline');

  return (
    <div className="px-8 py-8 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your pipeline and contacts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['pipeline', 'contacts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t === 'pipeline' ? 'Pipeline' : 'Contacts'}
          </button>
        ))}
      </div>

      {tab === 'pipeline' ? <PipelineTab /> : <ContactsTab />}
    </div>
  );
}
