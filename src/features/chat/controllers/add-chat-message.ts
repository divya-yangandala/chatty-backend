import { ObjectId } from 'mongodb';
import { UserCache } from '@service/redis/user.cache';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import mongoose from 'mongoose';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UploadApiResponse } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-upload';
import { BadRequestError } from '@global/helpers/error-handler';
import { config } from '@root/config';
import { IChatUsers, IMessageData, IMessageNotification } from '@chat/interfaces/chat.interface';
import { socketIOChatObject } from '@socket/chat';
import { INotificationTemplate } from '@notification/interfaces/notification.interface';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { emailQueue } from '@service/queues/email.queue';
import { MessageCache } from '@service/redis/message.cache';
import { joiValidation } from '@global/decorators/joi-validation.decorator';
import { addChatSchema } from '@chat/schemes/chat';
import { chatQueue } from '@service/queues/chat.queue';


const userCache: UserCache = new UserCache();
const messageCache: MessageCache = new MessageCache();

export class Add {
  @joiValidation(addChatSchema)
  public async message(req: Request, res: Response) {
    const {
      conversationId,
      receiverId,
      receiverUsername,
      receiverAvatarColor,
      // receiverProfileName,
      receiverProfilePicture,
      body,
      gifUrl,
      isRead,
      selectedImage
    } = req.body;
    let fileUrl = '';
    const messageObjectId: ObjectId = new ObjectId();
    const conversationObjectId: ObjectId = !conversationId ? new ObjectId() : conversationId;

    const sender: IUserDocument = await userCache.getUserFromCache(`${req.currentUser!.userId}`) as IUserDocument;

    if (selectedImage.length) {
      const result: UploadApiResponse = (await uploads(req.body.image, req.currentUser!.userId, true, true)) as UploadApiResponse;
      if (!result?.public_id) {
        throw new BadRequestError(result.message);
      }
      fileUrl = `https://res.cloudinary.com/${config.CLOUD_NAME}/image/upload/v${result.version}/${result.public_id}`;
    }

    const messageData: IMessageData = {
      _id: `${messageObjectId}`,
      conversationId: conversationObjectId,
      receiverId,
      receiverAvatarColor,
      receiverProfilePicture,
      receiverUsername,
      senderUsername: `${req.currentUser!.username}`,
      senderId: `${req.currentUser!.userId}`,
      senderAvatarColor: `${req.currentUser!.avatarColor}`,
      senderProfilePicture: `${sender.profilePicture}`,
      body,
      isRead,
      gifUrl,
      selectedImage: fileUrl,
      reaction: [],
      createdAt: new Date(),
      deleteForEveryone: false,
      deleteForMe: false
    }
    Add.prototype.emitSocketIOEvent(messageData);
    // we would send notification only if the users are not on the same chat list or page other wise if they ae on sam echat list we'll not send any notifications
    if (!isRead) {
      console.log(isRead);
      Add.prototype.messageNotification({
        currentUser: req.currentUser!,
        message: body,
        receiverName: receiverUsername,
        receiverId,
        messageData
      })
    }

    //1. Add sender to chat list
    await messageCache.addChatListToCache(`${req.currentUser!.userId}`, `${receiverId}`, `${conversationObjectId}`);
    //2. Add receiver to chat list
    await messageCache.addChatListToCache(`${receiverId}`, `${req.currentUser!.userId}`, `${conversationObjectId}`);

    //3. Add message data to cache
    await messageCache.addChatMessageToCache(`${conversationObjectId}`, messageData);   // this will save messages to the cache

    //4. Add message to chat queue
    chatQueue.addChatJob('addChatMessageToDB', messageData);

    res.status(HTTP_STATUS.OK).json({ message: 'Message added', conversationId: conversationObjectId });
  }

  public async addChatUsers(req: Request, res: Response): Promise<void> {
    const chatUsers = await messageCache.addChatUsersToCache(req.body);
    // we'll emit an event to give updated list back to the users in client
    socketIOChatObject.emit('add chat users', chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: 'Users added'});
  }

  public async removeChatUsers(req: Request, res: Response): Promise<void> {
    const chatUsers = await messageCache.removeChatUsersFromCache(req.body);
    socketIOChatObject.emit('remove chat users', chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: 'Users removed'});
  }

  private emitSocketIOEvent(data: IMessageData): void {
    socketIOChatObject.emit('message received', data);  // This will be to updates the chat messages (chat page with different messages).
    socketIOChatObject.emit('chat list', data);     // This will be used to update the chats lists.
  }

  private async messageNotification({ currentUser, message, receiverName, receiverId}: IMessageNotification): Promise<void> {
    const cachedUser: IUserDocument = await userCache.getUserFromCache(`${receiverId}`) as IUserDocument;
    if (cachedUser.notifications.messages) {
      const templateParams: INotificationTemplate = {
        username: receiverName,
          message,
          header: `Message notification from ${currentUser!.username}`
      }
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      // emailQueue.sendEmailJob('directMessageEmail', { receiverEmail: cachedUser!.email, template, subject: `You've received messages from ${currentUser!.username}`});
      emailQueue.addEmailJob('directMessageEmail', { receiverEmail: currentUser.email, template, subject: `You've received messages from ${currentUser!.username}`});
    }
  }



}
