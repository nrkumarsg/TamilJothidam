import { Injectable, Logger } from '@nestjs/common';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface ResetEmailContent {
  subject: string;
  html: string;
}

function buildResetEmail(resetLink: string, language: 'ta' | 'en'): ResetEmailContent {
  if (language === 'ta') {
    return {
      subject: 'உங்கள் கடவுச்சொல்லை மீட்டமைக்கவும் — தமிழ் ஜாதகம்',
      html: `<p>உங்கள் கணக்கிற்கான கடவுச்சொல் மீட்டமைப்பு கோரப்பட்டது.</p>
<p><a href="${resetLink}">இங்கே கிளிக் செய்து புதிய கடவுச்சொல்லை அமைக்கவும்</a> (30 நிமிடங்களுக்கு மட்டும் செல்லுபடியாகும்).</p>
<p>இந்த கோரிக்கையை நீங்கள் செய்யவில்லை என்றால், இந்த மின்னஞ்சலை புறக்கணிக்கவும்.</p>`,
    };
  }
  return {
    subject: 'Reset your password — Tamil Jathakam',
    html: `<p>A password reset was requested for your account.</p>
<p><a href="${resetLink}">Click here to set a new password</a> (valid for 30 minutes only).</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
  };
}

function buildPdfReportEmail(language: 'ta' | 'en'): ResetEmailContent {
  if (language === 'ta') {
    return {
      subject: 'உங்கள் ஜாதக அறிக்கை (PDF) — தமிழ் ஜோதிடம்',
      html: `<p>உங்கள் கோரிக்கையின்படி, உங்கள் ஜாதக அறிக்கை PDF கோப்பாக இணைக்கப்பட்டுள்ளது.</p>
<p>இந்த அறிக்கை பாரம்பரிய ஜோதிடக் கொள்கைகளின் அடிப்படையில் உருவாக்கப்பட்டதாகும்.</p>`,
    };
  }
  return {
    subject: 'Your Jathakam report (PDF) — Tamil Jothidam',
    html: `<p>As requested, your jathakam report is attached as a PDF.</p>
<p>This report is generated based on traditional astrological principles.</p>`,
  };
}

export interface EmailAttachment {
  filename: string;
  contentBase64: string;
}

// Raw fetch against Resend's HTTP API — same "raw fetch over SDK"
// precedent as AnthropicProvider/DeepSeekProvider, so this doesn't add a
// dependency for what's a couple of POST requests. Only two emails this
// app sends today (password reset, PDF report) — not a general-purpose
// mailer.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(to: string, resetLink: string, language: 'ta' | 'en'): Promise<void> {
    const { subject, html } = buildResetEmail(resetLink, language);
    const sent = await this.send(to, subject, html);
    if (!sent) {
      // Never thrown to the caller — AuthService.forgotPassword must return
      // its generic "if that email exists..." response either way, so a
      // misconfigured mailer doesn't leak account existence. This is the
      // one place an admin can actually see the failure.
      this.logger.error(`Cannot send password reset email to ${to}. Reset link: ${resetLink}`);
    }
  }

  // Throws (unlike the silent-failure password reset path above) — the
  // "Email me this PDF" button has no generic-response requirement to
  // protect, so the user should see a real error if it didn't send rather
  // than believe an email is on its way when none was.
  async sendPdfReportEmail(to: string, attachment: EmailAttachment, language: 'ta' | 'en'): Promise<void> {
    const { subject, html } = buildPdfReportEmail(language);
    const sent = await this.send(to, subject, html, [attachment]);
    if (!sent) {
      throw new Error('RESEND_API_KEY is not configured — cannot send email. Set it in the admin panel or backend/.env.');
    }
  }

  // Returns whether it actually sent (true) or was a no-op due to missing
  // configuration (false) — callers decide whether that's fatal.
  private async send(to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    if (!apiKey) return false;

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html,
          attachments: attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64 })),
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Resend API error ${response.status} sending to ${to}: ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to reach Resend API: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
