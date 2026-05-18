'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  Users,
  MapPin,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  name: string;
  location?: string;
  floor?: string;
  capacity?: number;
  amenities?: string[];
  status?: string;
  utilizationPct?: number;
}

interface Booking {
  id: string;
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  bookedBy?: string;
  attendeeCount?: number;
  notes?: string;
  status?: string;
}

interface RoomSummary {
  total?: number;
  available?: number;
  avgUtilization?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, string> = {
  projector:   '📽',
  whiteboard:  '🖊',
  video:       '📹',
  phone:       '📞',
};

const STATUS_BADGE: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  occupied:    'bg-amber-100 text-amber-700',
  maintenance: 'bg-red-100 text-red-700',
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Add Room Slide-over ──────────────────────────────────────────────────────

function AddRoomForm({ onClose, onSaved }: { onClose: () => void; onSaved: (r: Room) => void }) {
  const [form, setForm] = useState({
    name: '', location: '', floor: '', capacity: '', status: 'available',
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        name: form.name,
        location: form.location || undefined,
        floor: form.floor || undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        amenities,
        status: form.status,
      };
      const res = await fetch(`${API_BASE}/rooms`, {
        method: 'POST', headers: tenantHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to save room');
        return;
      }
      const saved = await res.json() as Room;
      onSaved(saved);
    } catch {
      setError('Failed to save room');
    } finally {
      setSaving(false);
    }
  }

  const AMENITY_LIST = ['projector', 'whiteboard', 'video', 'phone'];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[440px] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Room</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Room name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. Conference Room A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Building A" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Floor</label>
              <input type="text" value={form.floor} onChange={(e) => set('floor', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="2nd Floor" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="10" min="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_LIST.map((a) => (
                <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)}
                    className="w-3.5 h-3.5 rounded border-gray-300" />
                  <span className="text-sm text-gray-700 capitalize">{AMENITY_ICONS[a]} {a}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Add room'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Book Slot Modal ──────────────────────────────────────────────────────────

interface BookSlotModalProps {
  room: Room;
  date: string;
  defaultStart?: string;
  defaultEnd?: string;
  onClose: () => void;
  onBooked: (b: Booking) => void;
}

function BookSlotModal({ room, date, defaultStart, defaultEnd, onClose, onBooked }: BookSlotModalProps) {
  const [form, setForm] = useState({
    title: '',
    startTime: defaultStart ?? '09:00',
    endTime: defaultEnd ?? '10:00',
    attendeeCount: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        title: form.title,
        startTime: `${date}T${form.startTime}:00`,
        endTime: `${date}T${form.endTime}:00`,
        attendeeCount: form.attendeeCount ? parseInt(form.attendeeCount) : undefined,
        notes: form.notes || undefined,
      };
      const res = await fetch(`${API_BASE}/rooms/${room.id}/bookings`, {
        method: 'POST', headers: tenantHeaders(), body: JSON.stringify(body),
      });
      const d = await res.json() as Booking & { error?: string; conflict?: boolean };
      if (!res.ok) {
        setError(d.error ?? (d.conflict ? 'This slot conflicts with an existing booking.' : 'Failed to book room'));
        return;
      }
      onBooked(d);
    } catch {
      setError('Failed to book room');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[440px]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Book {room.name}</h2>
            <p className="text-xs text-gray-400">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. Team standup" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start time</label>
              <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End time</label>
              <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Attendee count</label>
            <input type="number" value={form.attendeeCount} onChange={(e) => set('attendeeCount', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="1" min="1" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={2} placeholder="Any notes…" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Booking…' : 'Book room'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Day Timeline ─────────────────────────────────────────────────────────────

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function timeToPercent(timeStr: string, date: string): number {
  const t = new Date(timeStr);
  const hours = t.getHours() + t.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((hours - HOUR_START) / TOTAL_HOURS) * 100));
}

function DayTimeline({ room, date, bookings, onBookSlot }: {
  room: Room;
  date: string;
  bookings: Booking[];
  onBookSlot: (room: Room, start: string, end: string) => void;
}) {
  const confirmed = bookings.filter((b) => b.roomId === room.id && b.status !== 'cancelled');

  return (
    <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden select-none">
      {/* Hour tick marks */}
      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
        const pct = (i / TOTAL_HOURS) * 100;
        return (
          <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-200/60" style={{ left: `${pct}%` }} />
        );
      })}
      {/* Booking blocks */}
      {confirmed.map((b) => {
        const left = timeToPercent(b.startTime, date);
        const right = timeToPercent(b.endTime, date);
        const width = right - left;
        if (width <= 0) return null;
        return (
          <div
            key={b.id}
            className="absolute top-1 bottom-1 bg-indigo-400 rounded text-white text-xs flex items-center px-1.5 overflow-hidden"
            style={{ left: `${left}%`, width: `${width}%` }}
            title={b.title}
          >
            <span className="truncate">{b.title}</span>
          </div>
        );
      })}
      {/* Click to book */}
      <div
        className="absolute inset-0 cursor-pointer"
        title="Click to book this room"
        onClick={() => onBookSlot(room, `${HOUR_START + 9}:00`, `${HOUR_START + 10}:00`)}
      />
    </div>
  );
}

// ─── Rooms Tab ────────────────────────────────────────────────────────────────

function RoomsTab({ rooms, summary, onAddRoom }: {
  rooms: Room[];
  summary: RoomSummary;
  onAddRoom: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total rooms</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.total ?? rooms.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Available now</p>
          <p className="text-2xl font-semibold text-green-600">
            {summary.available ?? rooms.filter((r) => r.status === 'available').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Avg utilization</p>
          <p className="text-2xl font-semibold text-gray-900">
            {summary.avgUtilization != null ? `${Math.round(summary.avgUtilization)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Rooms grid */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white border border-gray-200 rounded-xl text-center">
          <MapPin size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">No rooms yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first room to start managing bookings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{room.name}</h3>
                  {(room.location || room.floor) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />
                      {[room.floor, room.location].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${STATUS_BADGE[room.status ?? 'available'] ?? STATUS_BADGE.available}`}>
                  {room.status ?? 'available'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-gray-400" />
                <span className="text-xs text-gray-600">Capacity {room.capacity ?? '—'}</span>
              </div>
              {room.amenities && room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {room.amenities.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs capitalize">
                      {AMENITY_ICONS[a] ?? ''} {a}
                    </span>
                  ))}
                </div>
              )}
              {room.utilizationPct != null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Utilization</span>
                    <span className="text-xs font-medium text-gray-700">{room.utilizationPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${room.utilizationPct}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View schedule
                </button>
                <button
                  onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                >
                  Book
                </button>
              </div>
            </div>
          ))}
          {/* Add room card */}
          <button
            onClick={onAddRoom}
            className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors min-h-[180px]"
          >
            <Plus size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-500">Add room</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Book a Room Tab ──────────────────────────────────────────────────────────

function BookRoomTab({ rooms }: { rooms: Room[] }) {
  const [date, setDate] = useState(todayIso());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingFor, setBookingFor] = useState<{ room: Room; start: string; end: string } | null>(null);

  const fetchBookings = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rooms/bookings?date=${d}`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (res.ok) {
        const data = await res.json() as Booking[] | { bookings?: Booking[] };
        setBookings(Array.isArray(data) ? data : (data.bookings ?? []));
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchBookings(date); }, [date, fetchBookings]);

  // Hours labels
  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
    const h = HOUR_START + i;
    return h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  });

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {loading && <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />}
      </div>

      {/* Timeline header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Hour labels */}
        <div className="flex border-b border-gray-100 px-4 py-2">
          <div className="w-40 flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {hourLabels.map((label, i) => {
              const pct = (i / TOTAL_HOURS) * 100;
              return (
                <span key={label}
                  className="absolute text-xs text-gray-400 -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Room rows */}
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.roomId === room.id);
          return (
            <div key={room.id} className="flex items-center border-b border-gray-50 last:border-0 px-4 py-3 gap-4">
              <div className="w-40 flex-shrink-0">
                <p className="text-sm font-medium text-gray-800 truncate">{room.name}</p>
                <p className="text-xs text-gray-400">{room.capacity ? `Cap. ${room.capacity}` : ''}</p>
              </div>
              <div className="flex-1 relative">
                <DayTimeline
                  room={room}
                  date={date}
                  bookings={roomBookings}
                  onBookSlot={(r, s, end) => setBookingFor({ room: r, start: s, end })}
                />
              </div>
              <button
                onClick={() => setBookingFor({ room, start: '09:00', end: '10:00' })}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Book slot
              </button>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-400">No rooms available.</div>
        )}
      </div>

      {/* Book slot modal */}
      {bookingFor && (
        <BookSlotModal
          room={bookingFor.room}
          date={date}
          defaultStart={bookingFor.start}
          defaultEnd={bookingFor.end}
          onClose={() => setBookingFor(null)}
          onBooked={(b) => {
            setBookings((prev) => [...prev, b]);
            setBookingFor(null);
          }}
        />
      )}
    </div>
  );
}

// ─── RoomsClient ──────────────────────────────────────────────────────────────

export function RoomsClient() {
  const [tab, setTab] = useState<'rooms' | 'book'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [summary, setSummary] = useState<RoomSummary>({});
  const [loading, setLoading] = useState(true);
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [roomsRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/rooms`, { headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' } }),
          fetch(`${API_BASE}/rooms/summary`, { headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' } }),
        ]);
        if (roomsRes.ok) {
          const d = await roomsRes.json() as Room[] | { rooms?: Room[] };
          setRooms(Array.isArray(d) ? d : (d.rooms ?? []));
        }
        if (summaryRes.ok) {
          setSummary(await summaryRes.json() as RoomSummary);
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Room Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Manage meeting rooms and book spaces for your team.</p>
        </div>
        <button
          onClick={() => setShowAddRoom(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> Add room
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['rooms', 'Rooms'], ['book', 'Book a Room']] as const).map(([key, label]) => (
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

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'rooms' && (
            <RoomsTab
              rooms={rooms}
              summary={summary}
              onAddRoom={() => setShowAddRoom(true)}
            />
          )}
          {tab === 'book' && <BookRoomTab rooms={rooms} />}
        </>
      )}

      {showAddRoom && (
        <AddRoomForm
          onClose={() => setShowAddRoom(false)}
          onSaved={(r) => {
            setRooms((prev) => [...prev, r]);
            setShowAddRoom(false);
          }}
        />
      )}
    </div>
  );
}
