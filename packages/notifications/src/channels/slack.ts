import type { NotificationPayload, ChannelConfig, NotificationResult } from '../types';

export async function sendSlack(
  payload: NotificationPayload,
  config: ChannelConfig
): Promise<NotificationResult> {
  const url = config.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    return { channel: 'slack', success: false, error: 'Missing Slack webhook URL' };
  }

  try {
    const body = {
      text: `*${payload.title}*`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${payload.title}*\n${payload.body}` },
        },
        ...(payload.actorName
          ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `By: ${payload.actorName}` }] }]
          : []),
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Event: \`${payload.event}\` · Tenant: ${payload.tenantId}` }],
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { channel: 'slack', success: false, error: `HTTP ${res.status}` };
    }

    return { channel: 'slack', success: true };
  } catch (err: unknown) {
    return { channel: 'slack', success: false, error: String(err) };
  }
}
