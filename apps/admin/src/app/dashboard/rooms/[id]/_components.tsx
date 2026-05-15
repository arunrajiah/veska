'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Users,
  MapPin,
  CheckCircle,
  Clock,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-tenant-id': 'demo-tenant' };
}

interface Room {
  id: string;
  name: string;
  location?: string;
  floor?: string;
  capacity?: number;
  amenities?: string[];
  status?: string;
}

interface Booking {
  id: string;
  roomId?: string;
  title: string;
  startTime: string;
  endTime: string;
  bookedBy?: string;
  attendeeCount?: number;
  notes?: string;
  status?: string;
}

const AMENITY_ICONS: Record<string, string> = {
  projector: '📽', whiteboard: '🖊', video: '📹', phone: '📞',
};

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  occupied: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-red-100 text-red-700',
};

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function timeToPercent(timeStr: string): number {
  const t = new Date(timeStr);
  const hours = t.getHours() + t.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((hours - HOUR_START) / TOTAL_HOURS) * 100));
}

function formatTime(timeStr: string): string {
  return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Quick Booking Form ───────────────────────────────────────────────────────

function QuickBookingForm({ roomId, date, onBooked }: {
  roomId: string;
  date: string;
  onBooked: (b: Booking) => void;
}) {
  const [form, setForm] = useState({ title: '', startTime: '09:00', endTime: '10:00', attendeeCount: '', notes: '' });
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
      const res = await fetch(`${API_BASE}/rooms/${roomId}/bookings`, {
        method: 'POST', headers: tenantHeaders(), body: JSON.stringify(body),
      });
      const d = await res.json() as Booking & { error?: string };
      if (!res.ok) { setError(d.error ?? 'Failed to book'); return; }
      onBooked(d);
      setForm({ title: '', startTime: '09:00', endTime: '10:00', attendeeCount: '', notes: '' });
    } catch {
      setError('Failed to book room');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Quick Booking</h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Title *</label>
        <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="e.g. Team standup" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start</label>
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End</label>
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Attendees</label>
        <input type="number" value={form.attendeeCount} onChange={(e) => set('attendeeCount', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="1" min="1" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
        {saving ? 'Booking…' : 'Book room'}
      </button>
    </form>
  );
}

// ─── RoomDetailClient ─────────────────────────────────────────────────────────

interface RoomDetailClientProps {
  roomId: string;
  initialRoom: Room;
  initialBookings: Booking[];
  initialDate: string;
}

export function RoomDetailClient({ roomId, initialRoom, initialBookings, initialDate }: RoomDetailClientProps) {
  const router = useRouter();
  const [room] = useState<Room>(initialRoom);
  const [date, setDate] = useState(initialDate);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);

  const fetchBookings = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rooms/${roomId}/bookings?date=${d}`, {
        headers: { 'x-tenant-id': 'demo-tenant' },
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
  }, [roomId]);

  useEffect(() => { void fetchBookings(date); }, [date, fetchBookings]);

  function prevDay() {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(isoDate(d));
  }
  function nextDay() {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(isoDate(d));
  }

  async function cancelBooking(id: string) {
    try {
      await fetch(`${API_BASE}/rooms/${roomId}/bookings/${id}`, {
        method: 'DELETE', headers: tenantHeaders(),
      });
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // noop
    }
  }

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
    const h = HOUR_START + i;
    return h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  });

  const confirmed = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Back + Header */}
      <button onClick={() => router.push('/dashboard/rooms')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back to rooms
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{room.name}</h1>
          {(room.location || room.floor) && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin size={13} />
              {[room.floor, room.location].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[room.status ?? 'available'] ?? STATUS_BADGE.available}`}>
          {room.status ?? 'available'}
        </span>
      </div>

      {/* Room info card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Capacity</p>
          <p className="text-lg font-semibold text-gray-900 flex items-center gap-1.5">
            <Users size={16} className="text-gray-400" /> {room.capacity ?? '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2">
          <p className="text-xs text-gray-500 mb-2">Amenities</p>
          {room.amenities && room.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                  {AMENITY_ICONS[a] ?? ''} {a}
                </span>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No amenities listed</p>}
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevDay} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-gray-900 min-w-[180px] text-center">
          {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <button onClick={nextDay} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronRight size={16} />
        </button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {loading && <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />}
      </div>

      {/* Day timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex justify-between mb-1">
          {hourLabels.map((l) => (
            <span key={l} className="text-xs text-gray-400">{l}</span>
          ))}
        </div>
        <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: `${(i / TOTAL_HOURS) * 100}%` }} />
          ))}
          {confirmed.map((b) => {
            const left = timeToPercent(b.startTime);
            const right = timeToPercent(b.endTime);
            const width = right - left;
            if (width <= 0) return null;
            return (
              <div key={b.id}
                className="absolute top-1.5 bottom-1.5 bg-indigo-500 rounded text-white text-xs flex items-center px-2 overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={b.title}
              >
                <span className="truncate">{b.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bookings list */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Bookings for this day</h2>
          {confirmed.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-200 rounded-xl">
              <Clock size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No bookings for this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {confirmed.map((b) => (
                <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      {b.bookedBy && <span className="ml-2">· {b.bookedBy}</span>}
                      {b.attendeeCount && <span className="ml-2">· {b.attendeeCount} attendees</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => void cancelBooking(b.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancel booking"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick booking form */}
        <div>
          <QuickBookingForm
            roomId={roomId}
            date={date}
            onBooked={(b) => setBookings((prev) => [...prev, b])}
          />
        </div>
      </div>
    </div>
  );
}
