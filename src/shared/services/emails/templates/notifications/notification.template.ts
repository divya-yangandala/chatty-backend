import fs from 'fs';
import ejs from 'ejs';
import { INotificationTemplate } from '@notification/interfaces/notification.interface';

class NotificationTemplate {
  public notificationMessageTemplate(templateparams: INotificationTemplate): string {
    const { username, header, message } = templateparams;
    return ejs.render(fs.readFileSync(__dirname + '/notification.ejs', 'utf8'),{
      username,
      header,
      message,
      image_url: 'https://media.istockphoto.com/id/1389741211/vector/email-notification-concept-new-message-on-the-smartphone-screen-vector-illustration-in-retro.jpg?s=612x612&w=0&k=20&c=0lc6FWQtL3b3j52zWCguV1i3w1NCpFecxPrWx4e0C8g='
    });
  }
}

export const notificationTemplate: NotificationTemplate = new NotificationTemplate();
