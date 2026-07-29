'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

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

interface Stage {
  id: string;
  name: string;
  color?: string;
  order?: number;
  probability?: number;
}

interface StageFormProps {
  initial?: Stage;
  onSaved: () => void;
  onCancel: () => void;
}

function StageForm({ initial, onSaved, onCancel }: StageFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6366f1');
  const [order, setOrder] = useState(String(initial?.order ?? ''));
  const [probability, setProbability] = useState(String(initial?.probability ?? '50'));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        color,
        order: order ? parseInt(order, 10) : undefined,
        probability: probability ? parseInt(probability, 10) : undefined,
      };
      if (initial?.id) {
        await apiFetch(`/crm-tables/stages/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/crm-tables/stages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      console.error('Failed to save stage', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-800 mb-3">
        {initial ? 'Edit Stage' : 'Add Stage'}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Stage Name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Discovery"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-9 border border-gray-200 rounded cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6366f1"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Probability %</label>
          <input
            type="number"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            min="0"
            max="100"
            placeholder="50"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Display Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            min="1"
            placeholder="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Stage'}
        </button>
      </div>
    </div>
  );
}

export function StagesClient() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const res = await apiFetch<Stage[]>('/crm-tables/stages');
      setStages(Array.isArray(res) ? res : []);
    } catch {
      setStages([]);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stage? Deals in this stage may be affected.')) return;
    try {
      await apiFetch(`/crm-tables/stages/${id}`, { method: 'DELETE' });
      await fetchStages();
    } catch (err) {
      console.error('Failed to delete stage', err);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await apiFetch('/crm-tables/stages/seed', { method: 'POST' });
      await fetchStages();
    } catch (err) {
      console.error('Failed to seed stages', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pipeline Stages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage CRM pipeline stages</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {seeding ? 'Seeding…' : 'Seed defaults'}
          </button>
          <button
            onClick={() => {
              setEditingStage(null);
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add stage
          </button>
        </div>
      </div>

      {showAddForm && !editingStage && (
        <div className="mb-4">
          <StageForm
            onSaved={async () => {
              setShowAddForm(false);
              await fetchStages();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {stages.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400 mb-3">No pipeline stages defined.</p>
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Seed default stages →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Color</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Probability
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {stages
                .slice()
                .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
                .map((stage) => (
                  <>
                    <tr
                      key={stage.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{stage.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: stage.color ?? '#6366f1' }}
                          />
                          <span className="text-xs text-gray-400 font-mono">
                            {stage.color ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{stage.order ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {stage.probability != null ? `${stage.probability}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingStage(stage);
                              setShowAddForm(false);
                            }}
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(stage.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingStage?.id === stage.id && (
                      <tr key={`${stage.id}-edit`}>
                        <td colSpan={5} className="px-4 py-3 bg-indigo-50/30">
                          <StageForm
                            initial={stage}
                            onSaved={async () => {
                              setEditingStage(null);
                              await fetchStages();
                            }}
                            onCancel={() => setEditingStage(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
