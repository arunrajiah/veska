import type { VeskaPluginContext } from '@veska/sdk';

// config: { accessToken: string, calendarId: string }
interface GoogleCalendarConfig {
  accessToken: string;
  calendarId: string;
}

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

// Called when a Deal has a close date set — creates an all-day Google Calendar event
export async function onDealCloseDate(
  input: {
    deal: {
      id: string;
      data: { name: string; close_date: string; value?: number };
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { deal } = input;

  const config = (ctx as unknown as { config: GoogleCalendarConfig }).config;

  const closeDate = deal.data.close_date; // expected format: YYYY-MM-DD

  const description =
    deal.data.value != null
      ? `Deal value: ${deal.data.value}\nVeska Deal ID: ${deal.id}`
      : `Veska Deal ID: ${deal.id}`;

  // All-day event: start and end use the `date` field, not `dateTime`
  const event = {
    summary: `Deal close: ${deal.data.name}`,
    description,
    start: { date: closeDate },
    end: { date: closeDate },
  };

  const calendarId = encodeURIComponent(config.calendarId ?? 'primary');
  const url = `${GCAL_BASE}/calendars/${calendarId}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar event POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { id: string };

  await ctx.audit.log('google_calendar.event.created', {
    veskaDealId: deal.id,
    gcalEventId: result.id,
    closeDate,
  });
}

// Called when a Ticket is escalated — creates a 1-hour urgent reminder in Google Calendar
export async function onTicketEscalated(
  input: {
    ticket: {
      id: string;
      data: { subject: string; priority: string; assignee?: string };
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { ticket } = input;

  const config = (ctx as unknown as { config: GoogleCalendarConfig }).config;

  const now = new Date();
  const startTime = new Date(now.getTime() + 60 * 60 * 1000); // now + 1 hour
  const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // now + 2 hours

  const descriptionLines = [
    `Ticket ID: ${ticket.id}`,
    `Priority: ${ticket.data.priority}`,
  ];
  if (ticket.data.assignee != null) {
    descriptionLines.push(`Assignee: ${ticket.data.assignee}`);
  }

  const event = {
    summary: `[URGENT] ${ticket.data.subject}`,
    description: descriptionLines.join('\n'),
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    colorId: '11', // Tomato — signals urgency in Google Calendar
  };

  const calendarId = encodeURIComponent(config.calendarId ?? 'primary');
  const url = `${GCAL_BASE}/calendars/${calendarId}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar reminder POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { id: string };

  await ctx.audit.log('google_calendar.reminder.created', {
    veskaTicketId: ticket.id,
    gcalEventId: result.id,
    assignee: ticket.data.assignee,
  });
}
