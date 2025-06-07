import { NotificationModel } from '@notification/models/notification.schema';
import { ICommentDocument, ICommentJob, ICommentNameList, IQueryComment } from "@comment/interfaces/comment.interface";
import { CommentsModel } from "@comment/models/comment.schema";
import { IPostDocument } from "@post/interfaces/post.interface";
import { PostModel } from "@post/models/post.schema";
import { UserCache } from "@service/redis/user.cache";
import { IUserDocument } from "@user/interfaces/user.interface";
import mongoose, { Query } from "mongoose";
import { INotificationDocument, INotificationTemplate } from '@notification/interfaces/notification.interface';
import { socketIONotificationObject } from '@socket/notification';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { emailQueue } from '@service/queues/email.queue';

const userCache: UserCache = new UserCache();

class CommentService {
  public async addCommentToDB(commentData: ICommentJob): Promise<void> {
    const { postId, userTo, userFrom, username, comment } = commentData;
    const comments: ICommentDocument = await CommentsModel.create(commentData);
    const post: Query<IPostDocument, IPostDocument> = await PostModel.findOneAndUpdate(
      { _id: postId },
      { $inc: { commentsCount: 1 } },
      { new: true }   // update and return updated data uisng new keyword
    ) as unknown as  Query<IPostDocument, IPostDocument>

    const user: Promise<IUserDocument> = userCache.getUserFromCache(userTo) as Promise<IUserDocument>;  // send notification to user
    const response: [ICommentDocument, IPostDocument, IUserDocument] = await Promise.all([comments, post, user]);
    // send comment notifications
    if (response[2].notifications.comments && userFrom !== userTo) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom,
        userTo,
        message: `${username} commented on your post`,
        notificationType: 'comment',
        entityId: new mongoose.Types.ObjectId(postId),  // since we're sending notifications on post;
        createdItemId: new mongoose.Types.ObjectId(response[0]._id!),
        createdAt: new Date(),
        comment: comment.comment,
        post: response[1].post,
        imgId: response[1].imgId!,  // !because we are expecting typescript to return string and not undefined
        imgVersion: response[1].imgVersion!,
        gifUrl: response[1].gifUrl!,
        reaction: ''
      });
      // send to client with socketio
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      //send to email queue
      const templateParams: INotificationTemplate = {
        username: response[2].username!,
        message: `${username} commented on your post`,
        header: 'Comment Notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('followersEmail', { receiverEmail: response[2].email!, template, subject: 'post notification' })
    }
  }

  // method to get single or multipe comments of a post
  public async getPostComments(query: IQueryComment, sort: Record<string , 1 |-1>): Promise<ICommentDocument[]> {
    const comments: ICommentDocument[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort }
    ]);
    return comments;
  }

  public async getPostCommentNames(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentNameList[]> {
    const commentNamesList: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
      { $group: {_id: null, names: { $addToSet: '$username'}, count: { $sum: 1 } } },
      { $project:  { _id: 0 } }
    ])
    return commentNamesList;
  }
}

export const commentService: CommentService = new CommentService();
