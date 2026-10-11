export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailAdapter {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Console/Dev email adapter for environments without an external SMTP/email gateway configured.
 * Stores delivered emails in-memory for testing and logs delivery safely.
 */
export class ConsoleLogEmailAdapter implements IEmailAdapter {
  private sentMessages: SendEmailOptions[] = [];

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.sentMessages.push(options);
    // Safe structured logging
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[EmailAdapter] Sent email to: ${options.to} | Subject: ${options.subject}`);
    }
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  getSentMessages(): readonly SendEmailOptions[] {
    return this.sentMessages;
  }

  clear(): void {
    this.sentMessages = [];
  }
}
