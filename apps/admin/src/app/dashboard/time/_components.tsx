'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Square, ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_VESKA_TENANT_ID ?? 'demo';
const USER_ID = 'demo-user';

const PROJECTS = ['General', 'Project Alpha', 'Project Beta'];

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getWeekBounds(weekOffset: number): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = weekStart.toLocaleDateString('en-US', opts);
  const e = weekEnd.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface TimeEntry {
  id: string;
  userId?: string;
  description?: string;
  project?: string;
  billable?: boolean;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  hours?: number;
  date?: string;
}

interface TimerStatus {
  running: boolean;
  startedAt?: string;
  entryId?: string;
}

interface WeeklySummary {
  days: Record<string, number>; // ISO date -> hours
  totalHours: number;
  billableHours: number;
  estimatedValue?: number;
}

// ─── Timer Tab ────────────────────────────────────────────────────────────────

function TimerTab() {
  const [timerRunning, setTimerRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('General');
  const [billable, setBillable] = useState(false);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<'start' | 'stop' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = toISODate(new Date());

  const fetchTodayEntries = useCallback(async () => {
    try {
      const entries = await apiFetch<TimeEntry[]>(
        `/time-tracking/time-entries?userId=${USER_ID}&from=${today}&to=${today}`,
      );
      setTodayEntries(Array.isArray(entries) ? entries : []);
    } catch {
      setTodayEntries([]);
    }
  }, [today]);

  const checkTimerStatus = useCallback(async () => {
    try {
      const status = await apiFetch<TimerStatus>(
        `/time-tracking/time-entries/timer/status?userId=${USER_ID}`,
      );
      if (status.running && status.startedAt) {
        const start = new Date(status.startedAt);
        setStartedAt(start);
        setTimerRunning(true);
        const secs = Math.floor((Date.now() - start.getTime()) / 1000);
        setElapsed(secs);
      }
    } catch {
      // not running
    }
  }, []);

  useEffect(() => {
    checkTimerStatus();
    fetchTodayEntries();
  }, [checkTimerStatus, fetchTodayEntries]);

  useEffect(() => {
    if (timerRunning && startedAt) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, startedAt]);

  const handleStart = async () => {
    setLoading('start');
    try {
      await apiFetch('/time-tracking/time-entries/timer/start', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, description, project, billable }),
      });
      const now = new Date();
      setStartedAt(now);
      setTimerRunning(true);
      setElapsed(0);
    } catch (err) {
      console.error('Failed to start timer', err);
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading('stop');
    try {
      await apiFetch('/time-tracking/time-entries/timer/stop', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID }),
      });
      setTimerRunning(false);
      setStartedAt(null);
      setElapsed(0);
      setDescription('');
      await fetchTodayEntries();
    } catch (err) {
      console.error('Failed to stop timer', err);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/time-tracking/time-entries/${id}`, { method: 'DELETE' });
      await fetchTodayEntries();
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer widget */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-5">
          <div
            className={`flex items-center gap-2 text-5xl font-mono font-semibold tabular-nums ${
              timerRunning ? 'text-gray-900' : 'text-gray-300'
            }`}
          >
            <Clock size={32} className={timerRunning ? 'text-indigo-500 animate-pulse' : 'text-gray-300'} />
            {formatDuration(elapsed)}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              disabled={timerRunning}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              disabled={timerRunning}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 bg-white"
            >
              {PROJECTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <label className="text-xs font-medium text-gray-500">Billable</label>
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              disabled={timerRunning}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {!timerRunning ? (
            <button
              onClick={handleStart}
              disabled={loading === 'start'}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Play size={14} fill="currentColor" />
              {loading === 'start' ? 'Starting…' : 'Start Timer'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading === 'stop'}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Square size={14} fill="currentColor" />
              {loading === 'stop' ? 'Stopping…' : 'Stop Timer'}
            </button>
          )}
        </div>
      </div>

      {/* Today's entries */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Today&apos;s Entries
          </h2>
          <span className="text-xs text-gray-400">{today}</span>
        </div>

        {todayEntries.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No entries logged today.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Billable</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {todayEntries.map((entry) => {
                const dur = entry.durationSeconds != null
                  ? formatHoursMinutes(entry.durationSeconds / 3600)
                  : entry.hours != null
                  ? formatHoursMinutes(entry.hours)
                  : '—';
                return (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-900">{entry.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{entry.project ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{dur}</td>
                    <td className="px-4 py-2.5">
                      {entry.billable ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Billable</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Non-billable</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Add Manual Entry Form ─────────────────────────────────────────────────────

interface AddManualEntryFormProps {
  defaultDate: string;
  onSaved: () => void;
  onCancel: () => void;
}

function AddManualEntryForm({ defaultDate, onSaved, onCancel }: AddManualEntryFormProps) {
  const [date, setDate] = useState(defaultDate);
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [proj, setProj] = useState('General');
  const [billable, setBillable] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const totalHours = h + m / 60;
    if (totalHours <= 0) return;

    setSaving(true);
    try {
      await apiFetch('/time-tracking/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          userId: USER_ID,
          description: desc,
          project: proj,
          billable,
          date,
          hours: totalHours,
        }),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to save entry', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-800 mb-3">Add Manual Entry</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
          <select
            value={proj}
            onChange={(e) => setProj(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What did you work on?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            min="0"
            max="23"
            placeholder="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Minutes</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            min="0"
            max="59"
            placeholder="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600"
          />
          Billable
        </label>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timesheet Tab ────────────────────────────────────────────────────────────

function TimesheetTab() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { weekStart, weekEnd } = getWeekBounds(weekOffset);
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekEnd);

  const fetchData = useCallback(async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.allSettled([
        apiFetch<TimeEntry[]>(
          `/time-tracking/time-entries?userId=${USER_ID}&from=${weekStartISO}&to=${weekEndISO}`,
        ),
        apiFetch<WeeklySummary>(
          `/time-tracking/time-entries/weekly-summary?userId=${USER_ID}&weekStart=${weekStartISO}`,
        ),
      ]);
      if (entriesRes.status === 'fulfilled') {
        setEntries(Array.isArray(entriesRes.value) ? entriesRes.value : []);
      } else {
        setEntries([]);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      } else {
        setSummary(null);
      }
    } catch {
      setEntries([]);
      setSummary(null);
    }
  }, [weekStartISO, weekEndISO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/time-tracking/time-entries/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  // Build 7-day grid
  const dayGrid = WEEK_DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = toISODate(d);
    const hours = summary?.days?.[iso] ?? 0;
    return { iso, label: WEEK_DAYS[i], hours };
  });

  const totalHours = summary?.totalHours ?? entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  const billableHours = summary?.billableHours ?? entries.filter((e) => e.billable).reduce((s, e) => s + (e.hours ?? 0), 0);
  const estimatedValue = summary?.estimatedValue;

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <span className="text-sm font-medium text-gray-700">{formatWeekLabel(weekStart, weekEnd)}</span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 7-column day grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayGrid.map(({ iso, label, hours }) => {
            const isToday = iso === toISODate(new Date());
            return (
              <div
                key={iso}
                className={`px-2 py-3 text-center border-r border-gray-50 last:border-0 ${
                  isToday ? 'bg-indigo-50' : ''
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {label}
                </p>
                <p className="text-xs text-gray-400">{iso.slice(5)}</p>
                <p className={`text-sm font-semibold mt-1 ${hours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                  {hours > 0 ? formatHoursMinutes(hours) : '—'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Total Hours</p>
            <p className="text-sm font-semibold text-gray-900">{formatHoursMinutes(totalHours)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Billable Hours</p>
            <p className="text-sm font-semibold text-green-700">{formatHoursMinutes(billableHours)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Est. Value</p>
            <p className="text-sm font-semibold text-gray-700">
              {estimatedValue != null
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(estimatedValue)
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Add entry button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Entries this week</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus size={14} />
            Add manual entry
          </button>
        )}
      </div>

      {showAddForm && (
        <AddManualEntryForm
          defaultDate={weekStartISO}
          onSaved={async () => { setShowAddForm(false); await fetchData(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Entries table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">No entries for this week.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Billable</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const dur = entry.hours != null ? formatHoursMinutes(entry.hours) : '—';
                return (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.date?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-900">{entry.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{entry.project ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{dur}</td>
                    <td className="px-4 py-2.5">
                      {entry.billable ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Billable</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Non-billable</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                          className="text-gray-400 hover:text-indigo-500 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

type Tab = 'timer' | 'timesheet';

export function TimeTrackingClient() {
  const [tab, setTab] = useState<Tab>('timer');

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage your time</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['timer', 'timesheet'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t === 'timer' ? 'Timer' : 'Timesheet'}
          </button>
        ))}
      </div>

      {tab === 'timer' ? <TimerTab /> : <TimesheetTab />}
    </div>
  );
}
