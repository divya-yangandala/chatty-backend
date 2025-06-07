import { followerData } from './../../../mocks/followers.mock';
import Logger from 'bunyan';
import { BaseCache } from '@service/redis/base.cache';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { IFollowerData } from '@follower/interfaces/follower.interface';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserCache } from './user.cache';
import mongoose, { ObjectId } from 'mongoose';
import { FollowerModel } from '@follower/models/follower.schema';
import ObjecId from "mongodb";
import { Helpers } from '@global/helpers/helpers';
import { remove } from 'lodash';

const log: Logger = config.createLogger('followersCache')
const userCache: UserCache = new UserCache();

export class FollowersCache extends BaseCache {
  constructor() {
    super('followersCache');
  }

  public async saveFollowerToCache(key: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        this.client.connect();
      }
      await this.client.LPUSH(key, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.')
    }
  }

  public async removeFollowerFromCache(key: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        this.client.connect();
      }
      await this.client.LREM(key, 1, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.')
    }
  }

  public async updateFollowersCountInCache(userId: string, prop: string, value: number): Promise<void> {
    try {
      if (!this.client.isOpen) {
        this.client.connect();
      }
      console.log("${userId}`, prop, value)  ", userId, prop, value);
      await this.client.HINCRBY(`users:${userId}`, prop, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.')
    }
  }

  public async getFollowersFromCache(key: string): Promise<IFollowerData[]> {
    try {
      if (!this.client.isOpen) {
        this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(key, 0, -1);  // get data uing list LRANGE
      const list: IFollowerData[] = [];
      for (const item of response) {
        const user: IUserDocument = await userCache.getUserFromCache(item) as IUserDocument;
        const data: IFollowerData = {
          _id: new mongoose.Types.ObjectId(user._id),
          username: user.username!,
          avatarColor: user.avatarColor!,
          postCount: user.postsCount,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          profilePicture: user.profilePicture,
          uId: user.uId!,
          userProfile: user,
        }
        list.push(data);
      }
      return list;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.')
    }
  }

  public async updateBlockedUserPropInCache(key: string, prop: string, value: string, type: 'block'|'unblock'): Promise<void> {
    try {
      if (!this.client.isOpen) {
        this.client.connect();
      }
      const response: string = await this.client.HGET(`users:${key}`, prop) as string;
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      let blocked: string[] = Helpers.parseJson(response) as string[];
      console.log("blocked:  ", blocked);
      console.log("value:  ", value);
      if (type === 'block') {
        // if (blocked) {
        //   blocked = [...blocked, value];
        // } else {
        //   blocked = [value];
        // }
        blocked = [...blocked, value];
      } else {
        remove(blocked, (id: string) => id === value);    // unblock
        blocked = [...blocked]
      }
      // const dataToSave: string[] = [`${prop}`, JSON.stringify(blocked)];
      multi.HSET(`users:${key}`, `${prop}`, JSON.stringify(blocked));
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.')
    }
  }

}
