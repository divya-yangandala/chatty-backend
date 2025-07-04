import { Helpers } from "@global/helpers/helpers";
import { INotificationDocument, INotificationTemplate } from "@notification/interfaces/notification.interface";
import { NotificationModel } from "@notification/models/notification.schema";
import { IPostDocument } from "@post/interfaces/post.interface";
import { PostModel } from "@post/models/post.schema";
import { IQueryReaction, IReactionDocument, IReactionJob } from "@reaction/interfaces/reaction.interface";
import { ReactionModel } from "@reaction/models/reaction.schema";
import { notificationTemplate } from "@service/emails/templates/notifications/notification.template";
import { emailQueue } from "@service/queues/email.queue";
import { UserCache } from "@service/redis/user.cache";
import { socketIONotificationObject } from "@socket/notification";
import { IUserDocument } from "@user/interfaces/user.interface";
import { omit } from "lodash";
import mongoose from "mongoose";


const userCache: UserCache = new UserCache();

class ReactionService {
  public async addReactionDataToDB(reactionData: IReactionJob): Promise<void> {
    const { postId, userTo, userFrom, username, type, previousReaction, reactionObject } = reactionData;  // userfrom and userTo will be used in notifications
    console.log('reactionData', reactionData);
    // we are already having an _id from reactionObject and monogodb is adding its won _is from "replaceOne".
    // Hence we're using omit to delete the _id so that mongo can add its own _id
    let updatedReactionObject: IReactionDocument = reactionObject as unknown as IReactionDocument;
    if (previousReaction) {
      // delete reactionObject!._id;    we can have use this too. But we are using lodash omit. we want to replace every item, including the ID itself.
      updatedReactionObject = omit(reactionObject, ['_id']);
    }
    const updatedReaction: [IUserDocument, IReactionDocument, IPostDocument] = await Promise.all([
      userCache.getUserFromCache(`${userTo}`),
      ReactionModel.replaceOne({ postId, type: previousReaction, username }, updatedReactionObject, {upsert: true}),
      PostModel.findOneAndUpdate(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1,
            [`reactions.${type}`]: 1
          }
        }, { new: true }
      )
    ]) as unknown as [IUserDocument, IReactionDocument, IPostDocument];

    // send notifications
    if(updatedReaction[0].notifications.reactions && userTo !== userFrom) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom: userFrom as string,
        userTo: userTo as string,
        message: `${username} reacted to your post`,
        notificationType: 'reactions',
        entityId: new mongoose.Types.ObjectId(postId),  // since we're sending notifications on post;
        createdItemId: new mongoose.Types.ObjectId(updatedReaction[1]._id!),
        createdAt: new Date(),
        comment: '',
        post: updatedReaction[2].post,
        imgId: updatedReaction[2].imgId!,  // !because we are expecting typescript to return string and not undefined
        imgVersion: updatedReaction[2].imgVersion!,
        gifUrl: updatedReaction[2].gifUrl!,
        reaction: type!
      })
      // send to client with socketio
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      //send to email queue
      const templateParams: INotificationTemplate = {
        username: updatedReaction[0].username!,
        message: `${username} reacted to your post`,
        header: 'Post Reaction Notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('reactionsEmail', { receiverEmail: updatedReaction[0].email!, template, subject: 'Post Reaction Notification' });

    }
  }

  public async removeReactionDataFromDB(reactionData: IReactionJob): Promise<void> {
    const { postId, previousReaction, username } = reactionData;
    await Promise.all([
      ReactionModel.deleteOne({ postId, type: previousReaction, username }),
      PostModel.updateOne(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1
          }
        },
        { new: true }
      )
    ])
  }

  public async getPostReactions(query: IQueryReaction, sort: Record<string, 1 | -1>): Promise<[IReactionDocument[], number]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: query },
      { $sort: sort }
    ]);
    return [reactions, reactions.length];
  }

  public async getSinglePostReactionByUsername(postId: string, username: string): Promise<[IReactionDocument, number] | []> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId), username: Helpers.firstLetterUppercase(username) } }
    ]);
    return reactions.length ? [reactions[0], 1]: [];
  }

  // this method will return all reactions from a aprticular username irrespective of the POST
  // We are implmenting this mrthod only in DB and not in REdis beacuse it will be too much in Redis to do which is much simpler via DB
  public async getReactionsByUsername(username: string): Promise<IReactionDocument[]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { username: Helpers.firstLetterUppercase(username) } }
    ]);
    return reactions;
  }

}

export const reactionService: ReactionService = new ReactionService();


// replaceOne:- mongoose replace one method.
// So what the replace one does is it looks for a documents that matches certain criteria, like you want
// to look for a document with a specific idea or the specific property.
// So that documents, we want to replace it with a new documents. And if document does not exists it creates a new one
