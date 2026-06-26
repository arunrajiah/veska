import type { NotificationPayload, ChannelConfig, NotificationResult } from '../types';

export async function sendEmail(
  payload: NotificationPayload,
  config: ChannelConfig
): Promise<NotificationResult> {
  const apiKey = config.resendApiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey || !config.toEmail) {
    return { channel: 'email', success: false, error: 'Missing API key or recipient' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; margin-bottom: 8px;">${payload.title}</h2>
        <p style="color: #555; line-height: 1.6;">${payload.body}</p>
        ${payload.actorName ? `<p style="color: #888; font-size: 13px; margin-top: 16px;">Action taken by: ${payload.actorName}</p>` : ''}
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #aaa; font-size: 12px;">This notification was sent by Veska ERP.</p>
      </div>
    `;

    await resend.emails.send({
      from: config.fromEmail ?? 'Veska ERP <noreply@example.com>',
      to: config.toEmail,
      subject: payload.title,
      html,
    });

    return { channel: 'email', success: true };
  } catch (err: unknown) {
    return { channel: 'email', success: false, error: String(err) };
  }
}
