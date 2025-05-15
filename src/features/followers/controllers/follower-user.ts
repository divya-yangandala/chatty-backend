import { IFollowerData } from "@follower/interfaces/follower.interface";
import { followerQueue } from "@service/queues/follower.queue";
import { FollowersCache } from "@service/redis/followers.cache";
import { UserCache } from "@service/redis/user.cache";
import { socketIOFollowerObject } from "@socket/follower";
import { IUserDocument } from "@user/interfaces/user.interface";
import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const followersCache: FollowersCache = new FollowersCache();
const userCache: UserCache = new UserCache();

// remember we are not implmenting joiValidator schemes for the Followers count since most of our data is coming from client and currentUser
export class Add {
  public async follower(req: Request, res: Response): Promise<void> {
    const { followerId } = req.params;
    // update count in cache
    const followersCount: Promise<void> = followersCache.updateFollowersCountInCache(`${followerId}`, 'followersCount', 1);
    const followeeCount: Promise<void> = followersCache.updateFollowersCountInCache(`${req.currentUser!.userId}`, 'followingCount', 1);
    await Promise.all([followersCount, followeeCount]);
    // get both users from Cache
    const cachedFollower: Promise<IUserDocument> = userCache.getUserFromCache(followerId) as Promise<IUserDocument>;
    const cachedFollowee: Promise<IUserDocument> = userCache.getUserFromCache(`${req.currentUser!.userId}`) as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = await Promise.all([cachedFollower, cachedFollowee]);

    const followerObjectId: ObjectId = new ObjectId();
    const addFolloweeData: IFollowerData = Add.prototype.userData(response[0]);
    // send data to client using socketIO
    socketIOFollowerObject.emit('add follower', addFolloweeData);

    const addFollowerToCache: Promise<void> = followersCache.saveFollowerToCache(`following:${req.currentUser!.userId}`, `${followerId}`);
    const addFolloweeToCache: Promise<void> = followersCache.saveFollowerToCache(`followers:${followerId}`, `${req.currentUser!.userId}`);
    await Promise.all([addFollowerToCache, addFolloweeToCache]);

    //send data to queue
    followerQueue.addFollowerJob('addFollowerToDB', {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      username: req.currentUser!.username,
      followerDocumentId: followerObjectId
    })

    res.status(HTTP_STATUS.OK).json({ message: 'Following user now' });
  }

  private userData(user: IUserDocument): IFollowerData {
    return {
      _id: new mongoose.Types.ObjectId(user._id),
      username: user.username!,
      avatarColor: user.avatarColor!,
      postCount: user.postsCount!,
      followersCount: user.followersCount!,
      followingCount: user.followingCount!,
      profilePicture: user.profilePicture!,
      uId: user.uId!,
      userProfile: user
    }
  }
}

