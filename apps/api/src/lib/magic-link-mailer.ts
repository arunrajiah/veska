import { EmailChannelAdapter } from '@veska/core';

const PORTAL_BASE_URL = process.env['PORTAL_BASE_URL'] ?? 'http://localhost:3000';

/**
 * Fire-and-forget: send a magic link email via Resend.
 * Never throws — errors are logged and swallowed so callers
 * don't need to handle email failures in the happy path.
 */
export async function sendMagicLinkEmail(opts: {
  email: string;
  token: string;
  resourceType: string;
  recipientName?: string;
}): Promise<void> {
  const resendApiKey = process.env['RESEND_API_KEY'];
  const fromAddress = process.env['EMAIL_FROM_ADDRESS'] ?? 'Veska <noreply@veska.app>';

  if (!resendApiKey) {
    console.warn('[magic-link-mailer] RESEND_API_KEY not set — skipping email send');
    return;
  }

  try {
    const adapter = new EmailChannelAdapter({ resendApiKey, fromAddress });

    const portalUrl = `${PORTAL_BASE_URL}/portal/${opts.token}`;
    const bodyText = `Click the link below to access your Veska portal:\n\n${portalUrl}\n\nThis link expires in 7 days.`;

    // Build the formatted payload directly so we avoid constructing a full ChannelConfig
    const formatted = adapter.formatOutbound(
      { text: bodyText },
      {
        subject: 'Your Veska access link',
        to: opts.email,
      },
    ) as { to: string; from: string; subject: string; text: string; html: string };

    // Send via Resend directly using the adapter's internal client.
    // We reach into the formatted shape since EmailChannelAdapter exposes formatOutbound
    // as public and Resend is called inside send(). Replicate the send call here
    // to avoid requiring a synthetic ChannelConfig with required uuid/date fields.
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: formatted.from,
      to: formatted.to,
      subject: formatted.subject,
      text: formatted.text,
      html: formatted.html,
    });
  } catch (err) {
    console.error('[magic-link-mailer] Failed to send magic link email:', err);
  }
}
