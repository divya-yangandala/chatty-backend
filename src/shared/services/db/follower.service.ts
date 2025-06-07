import { NotificationModel } from '@notification/models/notification.schema';
import { IFollowerData, IFollowerDocument } from "@follower/interfaces/follower.interface";
import { FollowerModel } from "@follower/models/follower.schema";
import { IQueryComplete, IQueryDeleted } from "@post/interfaces/post.interface";
import { IUserDocument } from "@user/interfaces/user.interface";
import { UserModel } from "@user/models/user.schema";
import { BulkWriteResult, ObjectId } from "mongodb";
import mongoose, { Query } from "mongoose";
import { INotificationDocument, INotificationTemplate } from '@notification/interfaces/notification.interface';
import { socketIONotificationObject } from '@socket/notification';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { emailQueue } from '@service/queues/email.queue';
import { AuthModel } from '@auth/models/auth.schema';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { UserCache } from '@service/redis/user.cache';
import { map } from 'lodash';

const userCache: UserCache = new UserCache();

class FollowerService {
  public async addFollowerToDB(userId: string, followeeId: string, username: string, followerDocumentId: ObjectId): Promise<void> {
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId);
    const followerObjectId: ObjectId = new mongoose.Types.ObjectId(userId);

    const following = await FollowerModel.create({
      _id: followerDocumentId,
      followeeId: followeeObjectId,
      followerId: followerObjectId
    })

    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { followingCount: 1 } }
        }
      },
      {
        updateOne: {
          filter: { _id: followeeId },
          update: { $inc: { followersCount: 1 } }
        }
      }
    ])

    // above bulkWrite is equivalent to below queries
    // await UserModel.updateOne({ _id: followeeId }, { $inc: { followingCount: 1 } });
    // await UserModel.updateOne({ _id: userId }, { $inc: { followersCount: 1 } });

    const response: [BulkWriteResult, IUserDocument | null] = await Promise.all([users, userCache.getUserFromCache(followeeId)])   // we need to fetch user having the followeeId. We can either get it by cache or DB

    if (response[1]?.notifications.follows && userId !== followeeId) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom: userId,
        userTo: followeeId,
        message: `${response[1]!.username} is now following you`,
        notificationType: 'follows',
        entityId: new mongoose.Types.ObjectId(userId),  // since we're sending notifications on post;
        createdItemId: new mongoose.Types.ObjectId(following._id),
        createdAt: new Date(),
        comment: '',
        post: '',
        imgId: '',
        imgVersion: '',
        gifUrl: '',
        reaction: ''
      })

      // send to client with socketio
      socketIONotificationObject.emit('insert notification', notifications, { userTo: followeeId });

      //send to email queue
      const templateParams: INotificationTemplate = {
        username: response[1]!.username!,
        message: `${username} is now following you`,
        header: 'Follower Notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('commentsEmail', { receiverEmail: response[1]!.email!, template, subject: `${username} is now following you` })
    }

  }

  public async removeFollowerFromDB(followeeId: string, followerId: string): Promise<void> {
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId); // cast string to objectId
    const followerObjectId: ObjectId = new mongoose.Types.ObjectId(followerId);

    const unfollow: Query<IQueryComplete & IQueryDeleted, IFollowerDocument> = FollowerModel.deleteOne({
      followeeId: followeeObjectId,
      followerId: followerObjectId
    })

    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: followerId },
          update: { $inc: { followingCount: -1 } }
        }
      },
      {
        updateOne: {
          filter: { _id: followeeId },
          update: { $inc: { followersCount: -1 } }
        }
      }
    ])

    await Promise.all([unfollow, users])
  }

    public async getFolloweeData(userObjectId: ObjectId): Promise<IFollowerData[]> {
    const followee: IFollowerData[] = await FollowerModel.aggregate([
      { $match: { followerId: userObjectId } },
      { $lookup: { from: 'User', localField: 'followeeId', foreignField: '_id', as: 'followeeId' } },
      { $unwind: '$followeeId' },
      { $lookup: { from: 'Auth', localField: 'followeeId.authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      {
        $addFields: {
          _id: '$followeeId._id',
          username: '$authId.username',
          avatarColor: '$authId.avatarColor',
          uId: '$authId.uId',
          postCount: '$followeeId.postsId',
          followersCount: '$followeeId.followersCount',
          followingCount: '$followeeId.followingCount',
          profilePicture: '$followeeId.profilePicture',
          userProfile: '$followeeId'
        }
      },
      {
        $project: {
          authId: 0,
          followerId: 0,
          followeeId: 0,
          createdAt: 0,
          __v: 0
        }
      }
    ])
    return followee;
  }

  //  if we want to get all the follow ups for a particular user, we look for the document where followee = userObjectId
  public async getFollowerData(userObjectId: ObjectId): Promise<IFollowerData[]> {
    const follower: IFollowerData[] = await FollowerModel.aggregate([
      { $match: { followeeId: userObjectId } },
      { $lookup: { from: 'User', localField: 'followerId', foreignField: '_id', as: 'followerId' } },
      { $unwind: '$followerId' },
      { $lookup: { from: 'Auth', localField: 'followerId.authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      {
        $addFields: {
          _id: '$followerId._id',
          username: '$authId.username',
          avatarColor: '$authId.avatarColor',
          uId: '$authId.uId',
          postCount: '$followerId.postsId',
          followersCount: '$followerId.followersCount',
          followingCount: '$followerId.followingCount',
          profilePicture: '$followerId.profilePicture',
          userProfile: '$followerId'
        }
      },
      {
        $project: {
          authId: 0,
          followerId: 0,
          followeeId: 0,
          createdAt: 0,
          __v: 0
        }
      }
    ])
    return follower;
  }

  // This method will return all the followees ID of the particular userId
  public async getFolloweesIds(userId: string): Promise<string[]> {
    const followee = await FollowerModel.aggregate([
      { $match: { followerId: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          followeeId: 1,
          _id: 0
        }
      }
    ]);
    return map(followee, (result) => result.followeeId.toString())
  }

}

export const followerService: FollowerService = new FollowerService();
