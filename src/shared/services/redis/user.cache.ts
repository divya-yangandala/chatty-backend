import { BaseCache } from '@service/redis/base.cache';
import { config } from '@root/config';
import Logger from 'bunyan';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { IUserDocument, INotificationSettings, ISocialLinks } from '@user/interfaces/user.interface';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';
import { findIndex, indexOf } from 'lodash';

const log: Logger = config.createLogger('userCache');
type IUserItem = string | ISocialLinks | INotificationSettings
type UserCacheMultiType = string | number | Buffer | RedisCommandRawReply [] | IUserDocument | IUserDocument[];

export class UserCache extends BaseCache {
  constructor() {
    super('userCache');
  }

  public async saveUserToCache(key: string, userUId: string, createdUser: IUserDocument): Promise<void> {
    const createdAt = new Date();
    const {
      _id,
      uId,
      username,
      email,
      password,
      avatarColor,
      postsCount,
      work,
      school,
      quote,
      location,
      blocked,
      blockedBy,
      followersCount,
      followingCount,
      notifications,
      social,
      bgImageVersion,
      bgImageId,
      profilePicture
    } = createdUser;

    // const firstList: string[] = [
    //   '_id',
    //   `${_id}`,
    //   'uId',
    //   `${uId}`,
    //   'username',
    //   `${username}`,
    //   'email',
    //   `${email}`,
    //   'password',
    //   `${password}`,
    //   'avatarColor',
    //   `${avatarColor}`,
    //   'postsCount',
    //   `${postsCount}`,
    //   'createdAt',
    //   `${createdAt}`
    // ];

    // const secondList: string[] = [
    //   'blocked',
    //   JSON.stringify(blocked),
    //   'blockedBy',
    //   JSON.stringify(blockedBy),
    //   'profilePicture',
    //   `${profilePicture}`,
    //   'followersCount',
    //   `${followersCount}`,
    //   'followingCount',
    //   `${followingCount}`,
    //   'notifications',
    //   JSON.stringify(notifications),
    //   'social',
    //   JSON.stringify(social)
    // ];

    // const thirdList: string[] = [
    //   'work',
    //   `${work}`,
    //   'location',
    //   `${location}`,
    //   'school',
    //   `${school}`,
    //   'quote',
    //   `${quote}`,
    //   'bgImageVersion',
    //   `${bgImageVersion}`,
    //   'bgImageId',
    //   `${bgImageId}`
    // ];

    const dataToSave = {
      '_id': `${_id}`,
      'uId' :`${uId}`,
      'username': `${username}`,
      'email':`${email}`,
      'password': `${password}`,
      'avatarColor' :`${avatarColor}`,
      'postsCount': `${postsCount}`,
      'createdAt': `${createdAt}`,
      'blocked': JSON.stringify(blocked),
      'blockedBy': JSON.stringify(blockedBy),
      'profilePicture': `${profilePicture}`,
      'followersCount': `${followersCount}`,
      'followingCount': `${followingCount}`,
      'notifications': JSON.stringify(notifications),
      'social': JSON.stringify(social),
      'work': `${work}`,
      'location': `${location}`,
      'school': `${school}`,
      'quote': `${quote}`,
      'bgImageVersion': `${bgImageVersion}`,
      'bgImageId': `${bgImageId}`
    }

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.ZADD('user', { score: parseInt(userUId, 10), value: `${key}` });
      // await this.client.HSET(`users:${key}`, dataToSave);

      for (const [itemKey, itemValue] of Object.entries(dataToSave)) {
        await this.client.HSET(`users:${key}`, `${itemKey}`, `${itemValue}`);
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // this method is use to get user dat from cache in its orginal format since we stringify some props
  public async getUserFromCache(userId: string): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const response: IUserDocument = (await this.client.HGETALL(`users:${userId}`)) as unknown as IUserDocument;
      response.createdAt = new Date(Helpers.parseJson(`${response.createdAt}`));
      response.postsCount = Helpers.parseJson(`${response.postsCount}`);
      response.blocked = Helpers.parseJson(`${response.blocked}`);
      response.blockedBy = Helpers.parseJson(`${response.blockedBy}`);
      response.quote = Helpers.parseJson(`${response.quote}`);
      response.notifications = Helpers.parseJson(`${response.notifications}`);
      response.social = Helpers.parseJson(`${response.social}`);
      response.followersCount = Helpers.parseJson(`${response.followersCount}`);
      response.profilePicture = Helpers.parseJson(`${response.profilePicture}`);
      response.bgImageId = Helpers.parseJson(`${response.bgImageId}`);
      response.bgImageVersion = Helpers.parseJson(`${response.bgImageVersion}`);

      return response;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getUsersFromCache(start: number, end: number, excludeUserKey: string): Promise<IUserDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE('user', start, end, { REV: true });   // used for pagination
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const key of response) {
        if (key !== excludeUserKey) {
          multi.HGETALL(`users:${key}`);
        }
      }
      const replies: UserCacheMultiType = await multi.exec() as UserCacheMultiType;
      const userReplies: IUserDocument[] = [];
      for (const reply of replies as IUserDocument[]) {
        reply.createdAt = new Date(Helpers.parseJson(`${reply.createdAt}`));
        reply.postsCount = Helpers.parseJson(`${reply.postsCount}`);
        reply.blocked = Helpers.parseJson(`${reply.blocked}`);
        reply.blockedBy = Helpers.parseJson(`${reply.blockedBy}`);
        reply.quote = Helpers.parseJson(`${reply.quote}`);
        reply.notifications = Helpers.parseJson(`${reply.notifications}`);
        reply.social = Helpers.parseJson(`${reply.social}`);
        reply.followersCount = Helpers.parseJson(`${reply.followersCount}`);
        reply.profilePicture = Helpers.parseJson(`${reply.profilePicture}`);
        reply.bgImageId = Helpers.parseJson(`${reply.bgImageId}`);
        reply.bgImageVersion = Helpers.parseJson(`${reply.bgImageVersion}`);
        userReplies.push(reply);
      }
      return userReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async updateSingleUserItemInCache(userId: string, prop: string, value: IUserItem): Promise<IUserDocument | null> {
    try {
      if(!this.client.isOpen){
        await this.client.connect();
      }
      // const dataToSave: string[] = [`${prop}`, JSON.stringify(value)];
      await this.client.HSET(`users:${userId}`, `${prop}`, JSON.stringify(value));
      const response: IUserDocument = await this.getUserFromCache(userId) as IUserDocument;
      return response;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getTotalUsersInCache(): Promise<number> {
    try {
      if (!this.client.isOpen){
        await this.client.connect();
      }
      const count: number = await this.client.ZCARD('user');   // we will get the count from user sorted set
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getRandomUsersFromCache(userId: string, excludedUsername: string): Promise<IUserDocument[]> {
    try {
      if (!this.client.isOpen){
        await this.client.connect();
      }
      const replies: IUserDocument[] = [];
      const followers: string[] = await this.client.LRANGE(`followers:${userId}`, 0, -1);   // first we'll get the followers of the user from userId
      const users: string[] = await this.client.ZRANGE('user', 0, -1);    // here we'll get all the documents from the Sorted Set of User
      const randomUsers: string[] = Helpers.shuffle(users).slice(0, 10);   // randonly get users from Users through shuffle
      for (const key of randomUsers) {    // heere we'll check if the randomUsers is a followers from userid.
        const followerIndex = indexOf(followers, key);
        if (followerIndex < 0) {    // If yes, we'll exlude that follower from randomUsers list
          const userHash: IUserDocument = await this.client.HGETALL(`users:${key}`) as unknown as IUserDocument;
          replies.push(userHash);
        }
      }
      const excludedUsernameIndex: number = findIndex(replies, ['username', excludedUsername]);   // we'll check if excluded username exists in replies list
      replies.splice(excludedUsernameIndex, 1);
      // for (const reply of replies) {
      //   reply.createdAt = new Date(Helpers.parseJson(`${reply.createdAt}`));
      //   reply.postsCount = Helpers.parseJson(`${reply.postsCount}`);
      //   reply.blocked = Helpers.parseJson(`${reply.blocked}`);
      //   reply.blockedBy = Helpers.parseJson(`${reply.blockedBy}`);
      //   reply.quote = Helpers.parseJson(`${reply.quote}`);
      //   reply.notifications = Helpers.parseJson(`${reply.notifications}`);
      //   reply.social = Helpers.parseJson(`${reply.social}`);
      //   reply.followersCount = Helpers.parseJson(`${reply.followersCount}`);
      //   reply.profilePicture = Helpers.parseJson(`${reply.profilePicture}`);
      //   reply.bgImageId = Helpers.parseJson(`${reply.bgImageId}`);
      //   reply.bgImageVersion = Helpers.parseJson(`${reply.bgImageVersion}`);
      //   // replies.push(reply);
      // }
      return replies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
