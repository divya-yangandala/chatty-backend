import { IFollowerData } from "@follower/interfaces/follower.interface";
import { followerService } from "@service/db/follower.service";
import { FollowersCache } from "@service/redis/followers.cache";
import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const followersCache: FollowersCache = new FollowersCache();

export class Get {
  public async userFollowing(req: Request, res: Response): Promise<void> {
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(req.currentUser!.userId);
    // const cachedFollowees: IFollowerData[] = await followersCache.getFollowersFromCache(`following:${req.currentUser!.userId}`);
    const following: IFollowerData[] = await followerService.getFolloweeData(userObjectId);
    res.status(HTTP_STATUS.OK).json({ message: 'Following user now', following });
  }

  public async userFollowers(req: Request, res: Response): Promise<void> {
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(req.params.userId);
    // const cachedFollowers: IFollowerData[] = await followersCache.getFollowersFromCache(`followers:${req.params.userId}`);
    const followers: IFollowerData[] = await followerService.getFollowerData(userObjectId);
    res.status(HTTP_STATUS.OK).json({ message: 'User followers', followers });
  }
}
