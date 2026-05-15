import { sql } from 'drizzle-orm';
import { sharedDb, sharedQueueService } from '../shared.js';

// ── Email sending abstraction ─────────────────────────────────

async function insertEmailLog(
  tenantId: string,
  toEmail: string,
  subject: string,
  jobName: string,
): Promise<string> {
  const rows = await sharedDb.execute(sql`
    INSERT INTO "emailLog" ("tenantId", "jobName", "toEmail", subject, status)
    VALUES (${tenantId}, ${jobName}, ${toEmail}, ${subject}, 'pending')
    RETURNING id
  `);
  return ((rows as unknown[])[0] as Record<string, unknown>)['id'] as string;
}

async function sendEmail(
  tenantId: string,
  to: string,
  subject: string,
  html: string,
  jobName: string,
): Promise<void> {
  const logId = await insertEmailLog(tenantId, to, subject, jobName);

  try {
    // Get SMTP config from tenantSettings
    const rows = await sharedDb.execute(
      sql`SELECT * FROM "tenantSettings" WHERE "tenantId" = ${tenantId}`,
    );
    const settings = (rows as unknown[])[0] as Record<string, unknown> | undefined;

    if (!settings?.['smtpHost'] || !settings?.['smtpFromEmail']) {
      // No SMTP configured — log as skipped (not an error for dev)
      await sharedDb.execute(
        sql`UPDATE "emailLog" SET status='skipped', "sentAt"=now() WHERE id=${logId}`,
      );
      console.log(
        `[email-worker] SMTP not configured for tenant ${tenantId}, skipped: ${to} — ${subject}`,
      );
      return;
    }

    // Try to dynamically import nodemailer (graceful degradation if not installed)
    let nodemailer: {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      };
    };
    try {
      nodemailer = (await import('nodemailer')) as typeof nodemailer;
    } catch {
      await sharedDb.execute(
        sql`UPDATE "emailLog" SET status='skipped', "sentAt"=now() WHERE id=${logId}`,
      );
      console.log(`[email-worker] nodemailer not available, skipped: ${to}`);
      return;
    }

    // Decrypt SMTP password
    let smtpPass: string | undefined;
    if (settings['smtpPassEncrypted']) {
      const key = process.env['SETTINGS_ENCRYPTION_KEY'] ?? 'veska-dev-key-32chars-padding!!';
      const keyBuf = Buffer.from(key.slice(0, 32));
      const encrypted = settings['smtpPassEncrypted'] as string;
      const [ivHex, tagHex, cipherHex] = encrypted.split(':');
      const { createDecipheriv } = await import('node:crypto');
      const decipher = createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      smtpPass = decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8');
    }

    const transporter = nodemailer.createTransport({
      host: settings['smtpHost'] as string,
      port: (settings['smtpPort'] as number | undefined) ?? 587,
      secure: settings['smtpPort'] === 465,
      auth: settings['smtpUser']
        ? { user: settings['smtpUser'] as string, pass: smtpPass }
        : undefined,
    });

    await transporter.sendMail({
      from: `"${(settings['smtpFromName'] as string | undefined) ?? 'Veska'}" <${settings['smtpFromEmail'] as string}>`,
      to,
      subject,
      html,
    });

    await sharedDb.execute(
      sql`UPDATE "emailLog" SET status='sent', "sentAt"=now() WHERE id=${logId}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sharedDb.execute(
      sql`UPDATE "emailLog" SET status='failed', "errorMessage"=${msg} WHERE id=${logId}`,
    );
    console.error(`[email-worker] Failed to send email to ${to}:`, msg);
  }
}

// ── Worker registration ───────────────────────────────────────

export function registerEmailWorker(
  queueService: typeof sharedQueueService,
): void {
  // portal.send_invite
  queueService.registerWorker('portal.send_invite', async (job) => {
    const { tenantId, tokenId: _tokenId, email, portalUrl } = job.data as {
      tenantId: string;
      tokenId: string;
      email: string;
      portalUrl: string;
    };
    const subject = 'Your Customer Portal Access';
    const html = `<p>Hello,</p><p>You have been invited to access the customer portal.</p><p><a href="${portalUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Access Your Portal</a></p><p>This link is unique to you. Please do not share it.</p>`;
    await sendEmail(tenantId, email, subject, html, 'portal.send_invite');
  });

  // invoice.send_reminder
  queueService.registerWorker('invoice.send_reminder', async (job) => {
    const { tenantId, invoiceId, recipientEmail } = job.data as {
      tenantId: string;
      invoiceId: string;
      recipientEmail: string;
    };
    // Fetch invoice details
    const rows = await sharedDb.execute(
      sql`SELECT data FROM "entityRecords" WHERE id=${invoiceId} AND "tenantId"=${tenantId}`,
    );
    const invoice = ((rows as unknown[])[0] as Record<string, unknown> | undefined)?.['data'] as
      | Record<string, unknown>
      | undefined ?? {};
    const subject = `Payment Reminder: Invoice ${(invoice['invoiceNumber'] as string | undefined) ?? invoiceId}`;
    const html = `<p>This is a friendly reminder that invoice <strong>${(invoice['invoiceNumber'] as string | undefined) ?? invoiceId}</strong> for <strong>${(invoice['currency'] as string | undefined) ?? 'USD'} ${(invoice['total'] as string | undefined) ?? '0'}</strong> is due on <strong>${(invoice['dueDate'] as string | undefined) ?? 'N/A'}</strong>.</p><p>Please arrange payment at your earliest convenience.</p>`;
    await sendEmail(tenantId, recipientEmail, subject, html, 'invoice.send_reminder');
  });

  console.log('[email-worker] registered');
}
