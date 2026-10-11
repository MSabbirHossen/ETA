import { type IEmailAdapter, ConsoleLogEmailAdapter, type SendEmailOptions } from './email.adapter.js';

export class EmailService {
  private static adapter: IEmailAdapter = new ConsoleLogEmailAdapter();

  static setAdapter(adapter: IEmailAdapter): void {
    this.adapter = adapter;
  }

  static getAdapter(): IEmailAdapter {
    return this.adapter;
  }

  static async send(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      return await this.adapter.sendEmail(options);
    } catch (err: any) {
      console.error('[EmailService] Error dispatching email:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Email delivery failed',
      };
    }
  }
}
