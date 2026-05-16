/**
 * Notification mailer — fire-and-forget transactional emails via Resend.
 * Never throws — errors are logged and swallowed so callers don't need to
 * handle email failures in the happy path.
 */

const FROM = process.env['EMAIL_FROM'] ?? process.env['EMAIL_FROM_ADDRESS'] ?? 'Veska <notifications@veska.app>';

async function send(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resendApiKey = process.env['RESEND_API_KEY'];
  if (!resendApiKey) {
    console.warn('[notification-mailer] RESEND_API_KEY not set — skipping email send');
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);
    await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
  } catch (err) {
    console.error('[notification-mailer]', err);
  }
}

// ── Shared HTML primitives ────────────────────────────────────────────────────

function layout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Veska Notification</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:24px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Veska</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                You're receiving this because you use Veska. &copy; ${new Date().getFullYear()} Veska.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<p style="margin:24px 0 0;">
    <a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>
  </p>`;
}

function badge(text: string, approved: boolean): string {
  const bg = approved ? '#dcfce7' : '#fee2e2';
  const fg = approved ? '#166534' : '#991b1b';
  return `<span style="display:inline-block;background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;">${text}</span>`;
}

// ── sendApprovalDecisionEmail ─────────────────────────────────────────────────

export async function sendApprovalDecisionEmail(opts: {
  to: string;
  recipientName: string;
  entityType: string;
  entityRef: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  dashboardUrl?: string;
}): Promise<void> {
  const approved = opts.decision === 'approved';
  const label = approved ? 'Approved' : 'Rejected';
  const entityLabel = opts.entityType.replace(/_/g, ' ');

  const body = `
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Hi ${opts.recipientName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">
      Your ${entityLabel} <strong>${opts.entityRef}</strong> has been reviewed.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px 20px;width:100%;margin-bottom:20px;">
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Status</td>
        <td style="text-align:right;">${badge(label, approved)}</td>
      </tr>
      ${opts.reason ? `<tr>
        <td colspan="2" style="padding-top:12px;font-size:13px;color:#52525b;border-top:1px solid #e4e4e7;">
          <strong>Reason:</strong> ${opts.reason}
        </td>
      </tr>` : ''}
    </table>
    ${opts.dashboardUrl ? ctaButton('View in Dashboard', opts.dashboardUrl) : ''}
  `;

  await send({
    to: opts.to,
    subject: `Your ${entityLabel} "${opts.entityRef}" was ${label.toLowerCase()}`,
    html: layout(body),
  });
}

// ── sendApprovalRequestedEmail ────────────────────────────────────────────────

export async function sendApprovalRequestedEmail(opts: {
  to: string;
  approverName: string;
  requesterName: string;
  entityType: string;
  entityRef: string;
  amount?: number;
  currency?: string;
  approvalsUrl: string;
}): Promise<void> {
  const entityLabel = opts.entityType.replace(/_/g, ' ');
  const amountStr =
    opts.amount !== undefined
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: opts.currency ?? 'USD',
        }).format(opts.amount)
      : null;

  const body = `
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Hi ${opts.approverName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">
      <strong>${opts.requesterName}</strong> has submitted a ${entityLabel} that requires your approval.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px 20px;width:100%;margin-bottom:20px;">
      <tr>
        <td style="font-size:13px;color:#71717a;width:120px;padding-bottom:8px;">Reference</td>
        <td style="font-size:14px;color:#18181b;font-weight:600;">${opts.entityRef}</td>
      </tr>
      ${amountStr ? `<tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Amount</td>
        <td style="font-size:14px;color:#18181b;font-weight:600;">${amountStr}</td>
      </tr>` : ''}
      <tr>
        <td style="font-size:13px;color:#71717a;">Requested by</td>
        <td style="font-size:14px;color:#18181b;">${opts.requesterName}</td>
      </tr>
    </table>
    ${ctaButton('Review & Decide', opts.approvalsUrl)}
  `;

  await send({
    to: opts.to,
    subject: `Action required: ${entityLabel} "${opts.entityRef}" needs your approval`,
    html: layout(body),
  });
}

// ── sendLeaveDecisionEmail ────────────────────────────────────────────────────

export async function sendLeaveDecisionEmail(opts: {
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}): Promise<void> {
  const approved = opts.decision === 'approved';
  const label = approved ? 'Approved' : 'Rejected';
  const leaveLabel = opts.leaveType.charAt(0).toUpperCase() + opts.leaveType.slice(1);

  const body = `
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Hi ${opts.employeeName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">
      Your leave request has been reviewed.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px 20px;width:100%;margin-bottom:20px;">
      <tr>
        <td style="font-size:13px;color:#71717a;width:120px;padding-bottom:8px;">Leave type</td>
        <td style="font-size:14px;color:#18181b;font-weight:600;">${leaveLabel}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Dates</td>
        <td style="font-size:14px;color:#18181b;">${opts.startDate} – ${opts.endDate}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:${opts.reason ? '8' : '0'}px;">Status</td>
        <td>${badge(label, approved)}</td>
      </tr>
      ${opts.reason ? `<tr>
        <td colspan="2" style="padding-top:12px;font-size:13px;color:#52525b;border-top:1px solid #e4e4e7;">
          <strong>Reason:</strong> ${opts.reason}
        </td>
      </tr>` : ''}
    </table>
    <p style="margin:0;font-size:14px;color:#52525b;">
      ${approved
        ? 'Your leave has been approved. Please coordinate with your team before your start date.'
        : 'If you have questions, please reach out to your manager.'}
    </p>
  `;

  await send({
    to: opts.to,
    subject: `Your ${leaveLabel} leave request was ${label.toLowerCase()}`,
    html: layout(body),
  });
}

// ── sendInvoiceSentEmail ──────────────────────────────────────────────────────

export async function sendInvoiceSentEmail(opts: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  portalUrl: string;
}): Promise<void> {
  const amountStr = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: opts.currency,
  }).format(opts.amount);

  const body = `
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Hi ${opts.customerName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">
      A new invoice is ready for your review and payment.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px 20px;width:100%;margin-bottom:20px;">
      <tr>
        <td style="font-size:13px;color:#71717a;width:140px;padding-bottom:8px;">Invoice number</td>
        <td style="font-size:14px;color:#18181b;font-weight:600;">${opts.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Amount due</td>
        <td style="font-size:18px;color:#4f46e5;font-weight:700;">${amountStr}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;">Due date</td>
        <td style="font-size:14px;color:#18181b;">${opts.dueDate}</td>
      </tr>
    </table>
    ${ctaButton('View & Pay Invoice', opts.portalUrl)}
    <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
      If you have any questions about this invoice, please reply to this email.
    </p>
  `;

  await send({
    to: opts.to,
    subject: `Invoice ${opts.invoiceNumber} — ${amountStr} due ${opts.dueDate}`,
    html: layout(body),
  });
}
