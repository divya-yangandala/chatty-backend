import { BadRequestError } from './../../globals/helpers/error-handler';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import Logger from 'bunyan';
// import sendgridMail from '@sendgrid/mail';
import { config } from '@root/config';
import axios from 'axios';

interface IMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const log: Logger = config.createLogger('mailOptions');
// sendgridMail.setApiKey(config.SENDGRID_API_KEY!);

class MailTransport {
  public async sendEmail(receiverEmail: string, subject: string, body: string): Promise<void>{
    if (config.NODE_ENV === 'test' || config.NODE_ENV === 'development') {
      this.developmentEmailSender(receiverEmail, subject, body);
    } else {
      this.productionEmailSender(receiverEmail, subject, body);
    }
  }

  private async developmentEmailSender(receiverEmail: string, subject:string, body:string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",    //ethereal as host
      port: 587,
      secure: false, // true for port 465, false for other ports
      auth: {
        user: config.SENDER_EMAIL!,
        pass: config.SENDER_EMAIL_PASSWORD
      },
    });

    const mailOptions: IMailOptions = {
      from: `Chatty App <${config.SENDER_EMAIL!}>`,
      to: receiverEmail,
      subject,
      html: body
    }

      // send mail with defined transport object
    try {
      await transporter.sendMail(mailOptions);
      log.info("Development email sent successfully");
    } catch (error) {
      log.error('Error sending email', error);
      throw new BadRequestError('error sending email');
    }
  }

  private async productionEmailSender(receiverEmail: string, subject:string, body:string): Promise<void> {

    // const mailOptions: IMailOptions = {
    //   from: `Chatty App <${config!.MAILER_SENDER}>`,
    //   to: receiverEmail,
    //   subject,
    //   html: body
    // }

    const mailerSendPayload = {
      from: {
        email: config.MAILER_SENDER!,
        name: 'Chatty App',
      },
      to: [
        {
          email: receiverEmail,
          name: 'User',
        },
      ],
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // fallback plain text
    }

      // send mail with defined transport object
    // try {
    //   await sendgridMail.send(mailOptions);
    //   log.info("Production email sent successfully");
    // } catch (error) {
    //   log.error('Error sending email', error);
    //   throw new BadRequestError('error sending email');
    // }

    try {
      await axios.post('https://api.mailersend.com/v1/email', mailerSendPayload, {
        headers: {
          Authorization: `Bearer ${config.MAILERSEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      log.info('Production email sent successfully via MailerSend');
    } catch (error: any) {
      log.error('Error sending email', error.response?.data || error.message);
      throw new BadRequestError('error sending email');
    }
  }
}

export const mailTransport: MailTransport = new MailTransport();
