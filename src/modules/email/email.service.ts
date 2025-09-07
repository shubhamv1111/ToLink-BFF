import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete, email service disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server connection verified');
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'Email service not configured, logging reset token instead',
      );
      this.logger.log(`Password reset token for ${to}: ${resetToken}`);
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"ToLink Support" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: 'Reset Your ToLink Password',
      html: this.getPasswordResetTemplate(name, resetUrl, resetToken),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email service not configured, skipping welcome email');
      return;
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const mailOptions = {
      from: `"ToLink Team" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: 'Welcome to ToLink!',
      html: this.getWelcomeTemplate(name, frontendUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
      // Don't throw error for welcome emails, they're not critical
    }
  }

  /**
   * Password reset email template
   */
  private getPasswordResetTemplate(
    name: string,
    resetUrl: string,
    resetToken: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">🔗 ToLink</h1>
          <h2 style="color: #374151; margin-bottom: 30px;">Password Reset Request</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello ${name},<br><br>
            We received a request to reset your password for your ToLink account. 
            Click the button below to create a new password:
          </p>
          
          <div style="margin: 40px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; 
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
            If the button above doesn't work, you can copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              Reset token: <code>${resetToken}</code>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(name: string, frontendUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">🔗 Welcome to ToLink!</h1>
          
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">
            Hello ${name},
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thanks for joining ToLink! You can now create short, memorable links for all your URLs.
            Get started by creating your first shortened link.
          </p>
          
          <div style="margin: 40px 0;">
            <a href="${frontendUrl}/dashboard" 
               style="background-color: #10b981; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; 
                      display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Need help? Visit our <a href="${frontendUrl}/help" style="color: #2563eb;">Help Center</a> 
              or reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;
  }
}
