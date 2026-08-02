import type { MailMessage } from "../mail.service";

/**
 * The password reset email.
 *
 * Plain text is sent alongside the HTML, not as an afterthought — plenty of
 * mail clients and corporate gateways strip HTML, and a reset link that only
 * exists in the HTML part is a reset link some users can never use.
 */
export function passwordResetEmail(params: {
  to: string;
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): MailMessage {
  const { to, firstName, resetUrl, expiresInMinutes } = params;

  const text = [
    `Hi ${firstName},`,
    "",
    "Someone asked to reset the password for your SchoolWise account.",
    "",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    `The link expires in ${expiresInMinutes} minutes and can be used once.`,
    "",
    "If you did not request this, you can ignore this email — your password",
    "will not change. Signing in anywhere else will also invalidate the link.",
    "",
    "— SchoolWise",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111827;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">Reset your password</h1>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Hi ${escapeHtml(firstName)}, someone asked to reset the password for
        your SchoolWise account.
      </p>

      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(resetUrl)}"
           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500;">
          Choose a new password
        </a>
      </p>

      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
        The link expires in ${expiresInMinutes} minutes and can be used once.
        If the button does not work, copy this address into your browser:
      </p>

      <p style="margin:0 0 24px;font-size:12px;color:#6b7280;word-break:break-all;">
        ${escapeHtml(resetUrl)}
      </p>

      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        If you did not request this, you can ignore this email — your password
        will not change.
      </p>
    </div>
  </body>
</html>`.trim();

  return {
    to,
    subject: "Reset your SchoolWise password",
    text,
    html,
  };
}

/**
 * `firstName` comes from user input, so it must never be interpolated raw.
 * The URL is escaped too: it carries a token, and an unescaped `&` in a
 * query string silently truncates the href in some clients.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
