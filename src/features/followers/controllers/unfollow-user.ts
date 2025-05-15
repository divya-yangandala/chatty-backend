import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { FollowersCache } from "@service/redis/followers.cache";
import { followerQueue } from "@service/queues/follower.queue";

const followersCache: FollowersCache = new FollowersCache();

export class Remove {
  public async follower(req: Request, res: Response): Promise<void> {   // followerId is === req.currentUser
    const { followeeId, followerId } = req.params;
    const removeFollowerFromCache: Promise<void> = followersCache.removeFollowerFromCache(`following:${req.currentUser!.userId}`, followeeId);
    const removeFolloweeFromCache: Promise<void> = followersCache.removeFollowerFromCache(`followers:${followeeId}`, followerId);

    const followersCount: Promise<void> = followersCache.updateFollowersCountInCache(`${followeeId}`, 'followersCount', -1);
    const followeeCount: Promise<void> = followersCache.updateFollowersCountInCache(`${followerId}`, 'followingCount', -1);

    await Promise.all([removeFolloweeFromCache, removeFollowerFromCache, followersCount, followeeCount]);

    followerQueue.addFollowerJob('removeFollowerFromDB', {
      keyOne: `${followeeId}`,
      keyTwo: `${followerId}`
    });
    res.status(HTTP_STATUS.OK).json({ message: 'Unfollowed user now' });
  }
}
