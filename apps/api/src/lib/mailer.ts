import nodemailer, { type Transporter } from 'nodemailer';
import { getConfig } from '../config/env';
import { getLogger } from '../config/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  readonly enabled: boolean;
  send(message: MailMessage): Promise<void>;
}

/** Test/dev adapter: keeps messages in memory so tests can read reset links. */
export class MemoryMailer implements Mailer {
  readonly enabled = true;
  readonly outbox: MailMessage[] = [];
  async send(message: MailMessage) {
    this.outbox.push(message);
  }
  clear() {
    this.outbox.length = 0;
  }
}

/** Development-only adapter: prints emails (including links) to the console. Rejected in production by config. */
class ConsoleMailer implements Mailer {
  readonly enabled = true;
  async send(message: MailMessage) {
    getLogger().info({ to: message.to, subject: message.subject }, 'DEV EMAIL (not sent)');
    console.log(`\n----- DEV EMAIL to ${message.to} -----\nSubject: ${message.subject}\n\n${message.text}\n-----------------------------------\n`);
  }
}

class DisabledMailer implements Mailer {
  readonly enabled = false;
  async send(message: MailMessage) {
    // Content (which may contain tokens) is deliberately not logged.
    getLogger().warn({ subject: message.subject }, 'Email delivery is not configured; message dropped');
  }
}

class SmtpMailer implements Mailer {
  readonly enabled = true;
  private transporter: Transporter;
  constructor(private readonly from: string, smtp: NonNullable<ReturnType<typeof getConfig>['mail']['smtp']>) {
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }
  async send(message: MailMessage) {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (!mailer) {
    const { mail } = getConfig();
    switch (mail.transport) {
      case 'smtp':
        mailer = new SmtpMailer(mail.from, mail.smtp!);
        break;
      case 'console':
        mailer = new ConsoleMailer();
        break;
      case 'memory':
        mailer = new MemoryMailer();
        break;
      default:
        mailer = new DisabledMailer();
    }
  }
  return mailer;
}

export function setMailer(next: Mailer | undefined): void {
  mailer = next;
}

/** Sends without failing the caller's request; delivery errors are logged. */
export async function sendMailSafely(message: MailMessage): Promise<void> {
  try {
    await getMailer().send(message);
  } catch (err) {
    getLogger().error({ err: err instanceof Error ? err.message : String(err), subject: message.subject }, 'Email delivery failed');
  }
}
