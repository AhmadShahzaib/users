// email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    host: '127.0.0.1',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'tekdev@tekhqs.com',
      pass: 'Abacus@123',
    },
  });

  async sendMail(to: string, subject: string, htmlContent: string): Promise<void> {
    const mailOptions = {
      from: 'tekdev@tekhqs.com',
      to,
      subject,
      html: htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
