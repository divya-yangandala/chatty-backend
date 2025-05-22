import { BaseCache } from '@service/redis/base.cache';
import { config } from '@root/config';
import Logger from 'bunyan';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { IUserDocument, INotificationSettings, ISocialLinks } from '@user/interfaces/user.interface';

const log: Logger = config.createLogger('userCache');
type IUserItem = string | ISocialLinks | INotificationSettings

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

    const firstList: string[] = [
      '_id',
      `${_id}`,
      'uId',
      `${uId}`,
      'username',
      `${username}`,
      'email',
      `${email}`,
      'password',
      `${password}`,
      'avatarColor',
      `${avatarColor}`,
      'postsCount',
      `${postsCount}`,
      'createdAt',
      `${createdAt}`
    ];

    const secondList: string[] = [
      'blocked',
      JSON.stringify(blocked),
      'blockedBy',
      JSON.stringify(blockedBy),
      'profilePicture',
      `${profilePicture}`,
      'followersCount',
      `${followersCount}`,
      'followingCount',
      `${followingCount}`,
      'notifications',
      JSON.stringify(notifications),
      'social',
      JSON.stringify(social)
    ];

    const thirdList: string[] = [
      'work',
      `${work}`,
      'location',
      `${location}`,
      'school',
      `${school}`,
      'quote',
      `${quote}`,
      'bgImageVersion',
      `${bgImageVersion}`,
      'bgImageId',
      `${bgImageId}`
    ];

    const dataToSave: string[] = [...firstList, ...secondList, ...thirdList];

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.ZADD('user', { score: parseInt(userUId, 10), value: `${key}` });
      await this.client.HSET(`users:${key}`, dataToSave);
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
      console.log("responseee  ", response);
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
}
