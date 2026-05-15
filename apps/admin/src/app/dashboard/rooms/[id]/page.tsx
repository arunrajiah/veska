import { RoomDetailClient } from './_components.js';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomDetailPage({ params }: Props) {
  const { id } = await params;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const headers = { 'x-tenant-id': 'demo-tenant' };
  const today = new Date().toISOString().slice(0, 10);

  const [roomRes, bookingsRes] = await Promise.allSettled([
    fetch(`${API_BASE}/rooms/${id}`, { headers }),
    fetch(`${API_BASE}/rooms/${id}/bookings?date=${today}`, { headers }),
  ]);

  const room =
    roomRes.status === 'fulfilled' && roomRes.value.ok
      ? await roomRes.value.json()
      : { id, name: 'Unknown Room' };

  const bookings =
    bookingsRes.status === 'fulfilled' && bookingsRes.value.ok
      ? await bookingsRes.value.json()
      : [];

  return <RoomDetailClient roomId={id} initialRoom={room} initialBookings={Array.isArray(bookings) ? bookings : (bookings.bookings ?? [])} initialDate={today} />;
}
