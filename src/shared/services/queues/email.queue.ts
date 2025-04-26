import { emailWorker } from './../../workers/email.worker';
import { IEmailJob } from "@user/interfaces/user.interface";
import { BaseQueue } from "./base.queue";


class EmailQueue extends BaseQueue {
  constructor() {
    super('emails');
  }

  public addEmailJob(name: string, data: IEmailJob) : void {
    this.addJob(name, data);
    // we are going to use this method to send multiple types of email. First we'll try with forgot password
    this.processJob('forgotPasswordEmail', 5, emailWorker.addNotificationEmail);
  }
}

export const emailQueue: EmailQueue = new EmailQueue
