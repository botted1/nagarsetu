import nodemailer from "nodemailer";
import { Resend } from "resend";

const gmailUser = process.env.GMAIL_USER?.trim();
const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();
const resendKey = process.env.RESEND_API_KEY?.trim();
const fromName = process.env.MAIL_FROM_NAME?.trim() || "NagarSetu";

const gmailReady = Boolean(gmailUser && gmailPass);
const transporter = gmailReady
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    })
  : null;

const resend = resendKey ? new Resend(resendKey) : null;

type SendArgs = { to: string; subject: string; html: string; text: string };
type Channel = "gmail" | "resend" | "console";
type SendResult = { id: string; channel: Channel; devLogged: boolean };

/**
 * Multi-channel transactional mailer. Priority order:
 *   1. Gmail SMTP via App Password — works for any recipient.
 *   2. Resend — only delivers to the account owner's email until you verify
 *      a domain. We keep it wired so a future `domains.verify()` upgrade
 *      flips delivery to Resend automatically.
 *   3. Console — last-resort dev fallback so sign-in is never blocked.
 *
 * Errors are caught and we fall through to the next channel rather than
 * throwing, so a misconfigured key never breaks the demo.
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
}: SendArgs): Promise<SendResult> {
  if (transporter && gmailUser) {
    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${gmailUser}>`,
        to,
        subject,
        html,
        text,
      });
      return {
        id: info.messageId ?? "gmail",
        channel: "gmail",
        devLogged: false,
      };
    } catch (err) {
      console.warn(
        "[mail] Gmail SMTP failed, trying Resend / console fallback:",
        err instanceof Error ? err.message : err
      );
    }
  }

  if (resend) {
    try {
      const fromAddr =
        process.env.RESEND_FROM ?? `${fromName} <onboarding@resend.dev>`;
      const result = await resend.emails.send({
        from: fromAddr,
        to,
        subject,
        html,
        text,
      });
      if (result.error) throw new Error(result.error.message);
      return {
        id: result.data?.id ?? "resend",
        channel: "resend",
        devLogged: false,
      };
    } catch (err) {
      console.warn(
        "[mail] Resend rejected, falling back to console:",
        err instanceof Error ? err.message : err
      );
    }
  }

  logToConsole({ to, subject, text });
  return { id: "dev-noop", channel: "console", devLogged: true };
}

function logToConsole({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  console.log("\n──────── 📬 [dev mailer] ────────");
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("");
  console.log(text);
  console.log("─────────────────────────────────\n");
}

export function statusEmailTemplate(opts: {
  citizenName: string | null;
  grievanceTitle: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  url: string;
}) {
  const niceStatus = (s: string) =>
    s
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());

  const statusBadge = niceStatus(opts.toStatus);
  const greeting = opts.citizenName ? `Hi ${opts.citizenName},` : "Hello,";

  const text = `${greeting}

Your grievance "${opts.grievanceTitle}" has been updated to: ${statusBadge}.
${opts.note ? `\nUpdate: ${opts.note}\n` : ""}
View details: ${opts.url}

— NagarSetu`;

  const html = `<!doctype html>
<html><body style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f4f4f5;padding:24px;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);">
    <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">${statusBadge}</div>
    <h1 style="font-size:22px;margin:16px 0 8px 0;font-weight:600;">${opts.grievanceTitle}</h1>
    <p style="color:#52525b;line-height:1.6;margin:0 0 16px 0;">${greeting} your grievance has been updated.</p>
    ${opts.note ? `<div style="background:#fafafa;border-left:3px solid #F59E0B;padding:12px 16px;border-radius:6px;margin:16px 0;color:#3f3f46;">${opts.note}</div>` : ""}
    <a href="${opts.url}" style="display:inline-block;background:#F59E0B;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;margin-top:8px;">View grievance</a>
    <p style="margin-top:24px;color:#a1a1aa;font-size:12px;">NagarSetu · automated update</p>
  </div>
</body></html>`;

  return { html, text };
}

export function magicLinkTemplate(url: string, host: string) {
  const text = `Sign in to ${host}\n${url}`;
  const html = `<!doctype html>
<html><body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#f4f4f5;padding:24px;color:#18181b;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);">
    <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">NagarSetu</div>
    <h1 style="font-size:22px;margin:16px 0 8px 0;font-weight:600;">Sign in to ${host}</h1>
    <p style="color:#52525b;line-height:1.6;margin:0 0 16px 0;">Click the button below to sign in. The link is valid for 24 hours and can only be used once.</p>
    <a href="${url}" style="display:inline-block;background:#F59E0B;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;margin-top:8px;">Sign in</a>
    <p style="margin-top:24px;color:#a1a1aa;font-size:12px;">If you did not request this email, you can safely ignore it.</p>
  </div>
</body></html>`;
  return { html, text };
}
