import type { NotificationPayload, ChannelConfig, NotificationResult } from './types';
import { sendEmail } from './channels/email';
import { sendSlack } from './channels/slack';

/**
 * Dispatch a notification to all enabled channels.
 * Channels are tried in parallel; individual failures don't block others.
 */
export async function dispatch(
  payload: NotificationPayload,
  channels: ChannelConfig[]
): Promise<NotificationResult[]> {
  const enabled = channels.filter((c) => c.enabled);
  if (enabled.length === 0) return [];

  const results = await Promise.allSettled(
    enabled.map((ch) => {
      switch (ch.type) {
        case 'email':
          return sendEmail(payload, ch);
        case 'slack':
          return sendSlack(payload, ch);
        default:
          return Promise.resolve<NotificationResult>({ channel: ch.type, success: false, error: 'Unknown channel' });
      }
    })
  );

  return results.map((r) =>
    r.status === 'fulfilled' ? r.value : { channel: 'webhook' as const, success: false, error: String(r.reason) }
  );
}
