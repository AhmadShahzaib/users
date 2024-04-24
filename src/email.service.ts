// email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: 'mail.mydriverbook.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'support@mydriverbook.com',
      pass: 'v#9ayLBFmPMXB^hm9JPR',
    },
  });

  async sendMail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const mailOptions = {
      from: 'support@mydriverbook.com',
      to,
      subject,
      html: htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
