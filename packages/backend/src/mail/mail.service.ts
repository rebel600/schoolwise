import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

import type { Env } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Outbound email.
 *
 * SMTP rather than a provider-specific HTTP API, because every provider
 * (Gmail, Resend, SendGrid, Mailgun, Postmark, a school's own relay) speaks
 * SMTP. Switching providers becomes an environment change rather than a code
 * change.
 *
 * When SMTP is not configured the service falls back to logging the message.
 * That keeps local development working without credentials — but it is a
 * DEVELOPMENT fallback: in production, missing SMTP config is a startup
 * error, not a silent switch to "log the reset link to stdout".
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const host = this.config.get("SMTP_HOST", { infer: true });
    const isProduction =
      this.config.get("NODE_ENV", { infer: true }) === "production";

    if (!host) {
      if (isProduction) {
        throw new Error(
          "SMTP_HOST is required in production. Without it, password reset emails would be silently written to the log instead of delivered.",
        );
      }

      this.logger.warn(
        "SMTP is not configured. Emails will be written to this log instead of sent. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env to deliver them.",
      );
      return;
    }

    const port = this.config.get("SMTP_PORT", { infer: true });

    this.transporter = createTransport({
      host,
      port,
      /* 465 is implicit TLS; 587 upgrades via STARTTLS. */
      secure: port === 465,
      auth: {
        user: this.config.get("SMTP_USER", { infer: true }),
        pass: this.config.get("SMTP_PASSWORD", { infer: true }),
      },
    });

    this.logger.log(`SMTP configured: ${host}:${port}`);
  }

  async send(message: MailMessage): Promise<void> {
    const from = this.config.get("MAIL_FROM", { infer: true });

    if (!this.transporter) {
      /*
       * Development fallback. Logged in full so a reset link is usable
       * locally without a mail account.
       */
      this.logger.warn(
        [
          "",
          "──────────── EMAIL (not sent — SMTP unconfigured) ────────────",
          `To:      ${message.to}`,
          `Subject: ${message.subject}`,
          "",
          message.text,
          "──────────────────────────────────────────────────────────────",
        ].join("\n"),
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      this.logger.log(`Sent "${message.subject}" to ${message.to}`);
    } catch (error) {
      /*
       * Logged and swallowed for the password-reset path specifically: the
       * endpoint must return the same response whether or not an account
       * exists, and a 500 on send failure would leak that the address IS
       * registered. Callers that need delivery guarantees should queue
       * instead — see docs/03-backend.md, "Background Jobs".
       */
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
