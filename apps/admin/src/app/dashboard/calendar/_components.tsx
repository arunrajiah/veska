'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  CalendarDays,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const CURRENT_USER = 'demo-user';

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  location?: string;
  meetingUrl?: string;
  description?: string;
  organizer?: string;
  organizerId?: string;
  maxAttendees?: number;
  attendees?: Attendee[];
  status?: string;
}

interface Attendee {
  userId?: string;
  name?: string;
  email?: string;
  rsvp?: string;
}

interface CalendarDay {
  date: string;
  events: CalendarEvent[];
}

interface CalendarResponse {
  days?: CalendarDay[];
  events?: CalendarEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, { pill: string; dot: string }> = {
  meeting: { pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  training: { pill: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  social: { pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  holiday: { pill: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  general: { pill: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const DEFAULT_TYPE_COLORS: { pill: string; dot: string } = {
  pill: 'bg-gray-100 text-gray-600',
  dot: 'bg-gray-400',
};

function typeColors(type?: string): { pill: string; dot: string } {
  return (
    EVENT_TYPE_COLORS[type ?? 'general'] ?? EVENT_TYPE_COLORS['general'] ?? DEFAULT_TYPE_COLORS
  );
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  // 0=Mon…6=Sun
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── New Event Slide-over ─────────────────────────────────────────────────────

interface EventFormProps {
  onClose: () => void;
  onSaved: (ev: CalendarEvent) => void;
}

const BLANK_EVENT = {
  title: '',
  type: 'meeting',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  allDay: false,
  location: '',
  meetingUrl: '',
  maxAttendees: '',
  description: '',
};

function EventForm({ onClose, onSaved }: EventFormProps) {
  const [form, setForm] = useState(BLANK_EVENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const startIso = form.allDay
        ? form.startDate
        : form.startDate && form.startTime
          ? `${form.startDate}T${form.startTime}:00`
          : form.startDate;
      const endIso = form.allDay
        ? form.endDate || form.startDate
        : form.endDate && form.endTime
          ? `${form.endDate}T${form.endTime}:00`
          : form.endDate || startIso;

      const body = {
        title: form.title,
        type: form.type,
        startDate: startIso,
        endDate: endIso,
        allDay: form.allDay,
        location: form.location || undefined,
        meetingUrl: form.meetingUrl || undefined,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
        description: form.description || undefined,
      };
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? 'Failed to save event');
        return;
      }
      const saved = (await res.json()) as CalendarEvent;
      onSaved(saved);
    } catch {
      setError('Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Event title"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="meeting">Meeting</option>
              <option value="training">Training</option>
              <option value="social">Social</option>
              <option value="holiday">Holiday</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={form.allDay}
              onChange={(e) => set('allDay', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">
              All day
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            {!form.allDay && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">End date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            {!form.allDay && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">End time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Conference room, office, etc."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Meeting URL</label>
            <input
              type="url"
              value={form.meetingUrl}
              onChange={(e) => set('meetingUrl', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="https://meet.example.com/..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max attendees</label>
            <input
              type="number"
              value={form.maxAttendees}
              onChange={(e) => set('maxAttendees', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Leave blank for unlimited"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={3}
              placeholder="Event description…"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create event'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({
  event,
  onClose,
  onRsvpChange,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onRsvpChange: (eventId: string, rsvp: string) => void;
}) {
  const [rsvping, setRsvping] = useState(false);
  const colors = typeColors(event.type);
  const myAttendee = event.attendees?.find((a) => a.userId === CURRENT_USER);

  async function handleRsvp(status: string) {
    setRsvping(true);
    try {
      const res = await fetch(`${API_BASE}/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ userId: CURRENT_USER, status }),
      });
      if (res.ok) {
        onRsvpChange(event.id, status);
      }
    } catch {
      // noop
    } finally {
      setRsvping(false);
    }
  }

  const RSVP_BADGE: Record<string, string> = {
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    tentative: 'bg-amber-100 text-amber-700',
    pending: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors.pill}`}
              >
                {event.type ?? 'general'}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors mt-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(event.startDate || event.endDate) && (
            <div className="flex items-start gap-3">
              <Clock size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p>{formatDate(event.startDate)}</p>
                {event.endDate && event.endDate !== event.startDate && (
                  <p className="text-gray-500">— {formatDate(event.endDate)}</p>
                )}
                {!event.allDay && event.startDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(event.startDate)}
                    {event.endDate ? ` – ${formatTime(event.endDate)}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{event.location}</p>
            </div>
          )}
          {event.meetingUrl && (
            <div className="flex items-start gap-3">
              <CalendarDays size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline truncate"
              >
                {event.meetingUrl}
              </a>
            </div>
          )}
          {event.organizer && (
            <div className="flex items-start gap-3">
              <Users size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                Organized by <span className="font-medium">{event.organizer}</span>
              </p>
            </div>
          )}
          {event.description && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              {event.description}
            </p>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Attendees ({event.attendees.length})
              </p>
              <div className="space-y-1">
                {event.attendees.map((a, i) => (
                  <div
                    key={a.userId ?? i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center justify-center">
                        {(a.name ?? a.email ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{a.name ?? a.email ?? a.userId}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RSVP_BADGE[a.rsvp ?? 'pending'] ?? RSVP_BADGE.pending}`}
                    >
                      {a.rsvp ?? 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RSVP buttons */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
              Your RSVP
            </p>
            <div className="flex gap-2">
              {(['accepted', 'declined', 'tentative'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => void handleRsvp(status)}
                  disabled={rsvping}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 capitalize ${
                    myAttendee?.rsvp === status
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Events List Tab ──────────────────────────────────────────────────────────

function EventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`${API_BASE}/events?${params.toString()}`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (res.ok) {
        const d = (await res.json()) as CalendarEvent[] | { events?: CalendarEvent[] };
        setEvents(Array.isArray(d) ? d : (d.events ?? []));
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, typeFilter]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All types</option>
            <option value="meeting">Meeting</option>
            <option value="training">Training</option>
            <option value="social">Social</option>
            <option value="holiday">Holiday</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-gray-200 rounded-xl">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center bg-white border border-gray-200 rounded-xl">
          <CalendarDays size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">No events found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting the date range or type filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Date / Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Organizer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Attendees
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const colors = typeColors(ev.type);
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{ev.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors.pill}`}
                        >
                          {ev.type ?? 'general'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {ev.startDate ? (
                          <div>
                            <div>
                              {new Date(ev.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            {!ev.allDay && (
                              <div className="text-gray-400">{formatTime(ev.startDate)}</div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ev.location ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ev.organizer ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {ev.attendees?.length ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[ev.status ?? 'active'] ?? STATUS_BADGE.active}`}
                        >
                          {ev.status ?? 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedEvent(ev)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            View
                          </button>
                          <button className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            Edit
                          </button>
                          <button className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRsvpChange={() => {}}
        />
      )}
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [calData, setCalData] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/events/calendar?year=${y}&month=${m + 1}`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (res.ok) {
        const d = (await res.json()) as CalendarResponse;
        const map = new Map<string, CalendarEvent[]>();
        const days = d.days ?? [];
        days.forEach((day) => {
          map.set(day.date, day.events ?? []);
        });
        // Also handle flat events array
        if (d.events) {
          d.events.forEach((ev) => {
            const dateKey = ev.startDate?.slice(0, 10);
            if (dateKey) {
              const existing = map.get(dateKey) ?? [];
              if (!existing.find((e) => e.id === ev.id)) {
                map.set(dateKey, [...existing, ev]);
              }
            }
          });
        }
        setCalData(map);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayOfWeek(year, month);
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedDayEvents = selectedDay ? (calData.get(selectedDay) ?? []) : [];

  function handleEventRsvpChange(eventId: string, rsvp: string) {
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent((prev) => {
        if (!prev) return prev;
        const attendees = (prev.attendees ?? []).map((a) =>
          a.userId === CURRENT_USER ? { ...a, rsvp } : a,
        );
        return { ...prev, attendees };
      });
    }
  }

  return (
    <div className="flex gap-4">
      {/* Calendar panel */}
      <div className="flex-1">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Today
          </button>
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          )}
        </div>

        {/* Day of week header */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
          {/* Empty cells before month start */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 min-h-[100px]" />
          ))}
          {/* Day cells */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const dateStr = isoDate(year, month, day);
            const events = calData.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`bg-white min-h-[100px] p-2 cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-inset ring-indigo-400' : 'hover:bg-indigo-50/30'
                }`}
              >
                <div className="flex items-center justify-end mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map((ev) => {
                    const colors = typeColors(ev.type);
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-1.5 py-0.5 rounded text-xs truncate cursor-pointer ${colors.pill} hover:opacity-80`}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div className="text-xs text-gray-400 px-1">+{events.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-4">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No events this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => {
                  const colors = typeColors(ev.type);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700">
                            {ev.title}
                          </p>
                          <p className={`text-xs mt-0.5 capitalize ${colors.pill.split(' ')[1]}`}>
                            {ev.type ?? 'general'}
                          </p>
                          {!ev.allDay && ev.startDate && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatTime(ev.startDate)}
                            </p>
                          )}
                          {ev.location && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {ev.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRsvpChange={handleEventRsvpChange}
        />
      )}

      {/* New event slide-over */}
      {showNewEvent && (
        <EventForm
          onClose={() => setShowNewEvent(false)}
          onSaved={(ev) => {
            const dateKey = ev.startDate?.slice(0, 10);
            if (dateKey) {
              setCalData((prev) => {
                const next = new Map(prev);
                const existing = next.get(dateKey) ?? [];
                next.set(dateKey, [ev, ...existing]);
                return next;
              });
            }
            setShowNewEvent(false);
          }}
        />
      )}
    </div>
  );
}

// ─── CalendarClient ───────────────────────────────────────────────────────────

export function CalendarClient() {
  const [tab, setTab] = useState<'calendar' | 'events'>('calendar');
  const [showNewEvent, setShowNewEvent] = useState(false);

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage events, meetings, and company calendar.
          </p>
        </div>
        <button
          onClick={() => setShowNewEvent(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> New event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(
          [
            ['calendar', 'Calendar'],
            ['events', 'Events List'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calendar' && <CalendarGrid />}
      {tab === 'events' && <EventsList />}

      {showNewEvent && (
        <EventForm onClose={() => setShowNewEvent(false)} onSaved={() => setShowNewEvent(false)} />
      )}
    </div>
  );
}
