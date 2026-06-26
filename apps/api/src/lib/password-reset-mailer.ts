const ADMIN_BASE_URL = process.env['ADMIN_BASE_URL'] ?? 'http://localhost:3000';

/**
 * Fire-and-forget: send a password reset email via Resend.
 * Never throws — errors are logged and swallowed so callers
 * don't need to handle email failures in the happy path.
 */
export async function sendPasswordResetEmail(opts: {
  email: string;
  token: string;
  recipientName?: string;
}): Promise<void> {
  const resendApiKey = process.env['RESEND_API_KEY'];
  const fromAddress = process.env['EMAIL_FROM_ADDRESS'] ?? 'Veska <noreply@example.com>';

  if (!resendApiKey) {
    console.warn('[password-reset-mailer] RESEND_API_KEY not set — skipping email send');
    return;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const resetUrl = `${ADMIN_BASE_URL}/reset-password?token=${opts.token}`;
    const greeting = opts.recipientName ? `Hi ${opts.recipientName},` : 'Hi,';
    const bodyText = `${greeting}\n\nWe received a request to reset your Veska password.\n\nClick the link below to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.\n\n— The Veska team`;
    const bodyHtml = `<p>${greeting}</p><p>We received a request to reset your Veska password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p><p>— The Veska team</p>`;

    await resend.emails.send({
      from: fromAddress,
      to: opts.email,
      subject: 'Reset your Veska password',
      text: bodyText,
      html: bodyHtml,
    });
  } catch (err) {
    console.error('[password-reset-mailer] Failed to send password reset email:', err);
  }
}
