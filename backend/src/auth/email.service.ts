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

// Raw fetch against Resend's HTTP API — same "raw fetch over SDK"
// precedent as AnthropicProvider/DeepSeekProvider, so this doesn't add a
// dependency for what's a single POST request. Deliberately the only email
// this app sends today (password reset) — not a general-purpose mailer.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(to: string, resetLink: string, language: 'ta' | 'en'): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    if (!apiKey) {
      // Never thrown to the caller — AuthService.forgotPassword must return
      // its generic "if that email exists..." response either way, so a
      // misconfigured mailer doesn't leak account existence. This is the
      // one place an admin can actually see the failure.
      this.logger.error(
        `Cannot send password reset email: RESEND_API_KEY is not set. Reset link for ${to}: ${resetLink}`,
      );
      return;
    }

    const { subject, html } = buildResetEmail(resetLink, language);

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Resend API error ${response.status} sending to ${to}: ${body}`);
      }
    } catch (err) {
      this.logger.error(`Failed to reach Resend API: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
