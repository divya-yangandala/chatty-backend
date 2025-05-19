import { updatedPost } from './../../../mocks/post.mock';
import { BaseCache } from "@service/redis/base.cache";
import { config } from '@root/config';
import Logger from 'bunyan';
import { IPostDocument, ISavePostToCache } from "@post/interfaces/post.interface";
import { IReactions } from '@reaction/interfaces/reaction.interface';
import { ServerError } from "@global/helpers/error-handler";
import { Helpers } from "@global/helpers/helpers";
import { RedisCommandRawReply } from "@redis/client/dist/lib/commands";

const log: Logger = config.createLogger('PostCache');

//creating a type:--
  export type PostCacheMultiType = string | number | Buffer | RedisCommandRawReply[]|  IPostDocument | IPostDocument[];

export class PostCache extends BaseCache {

  constructor() {
    super('postCache');
  }

  public async savePostToCache(data: ISavePostToCache): Promise<void> {
    const { key, currentUserId, uId, createdPost} = data;

    const {
      _id,
      userId,
      username,
      email,
      avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount,
      imgVersion,
      imgId,
      reactions,
      createdAt
    } = createdPost;


  const dataToSave = {
    '_id': `${_id}`,
    'userId': `${userId}`,
    'username': `${username}`,
    'email': `${email}`,
    'avatarColor': `${avatarColor}`,
    'profilePicture': `${profilePicture}`,
    'post': `${post}`,
    'bgColor': `${bgColor}`,
    'feelings': `${feelings}`,
    'privacy': `${privacy}`,
    'gifUrl': `${gifUrl}`,
    'commentsCount': `${commentsCount}`,
    'reactions': JSON.stringify(reactions),
    'imgVersion': `${imgVersion}`,
    'imgId': `${imgId}`,
    'createdAt': `${createdAt}`
  }
  try {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    // 2 ways to add or retrieve data from Redis Cache i) this.client and ii) multi
    //So basically what the method does is you can add, you can use it to add multiple Redis commands and
    // then it will execute those commands at a go.

    //Since we are saving the postCounts data in users also, here we are updaing that value into users cache as well
    const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');  // get posts count
    const multi: ReturnType<typeof this.client.multi> = this.client.multi();
    multi.ZADD('post', { score: parseInt(uId, 10), value: `${key}` });  //create a set for Post

    // multi.HSET(`posts:${key}`, dataToSave);   //create a hash
    for (const[itemKey, itemValue] of Object.entries(dataToSave)) {
      multi.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
    }

    const count: number = parseInt(postCount[0], 10) + 1;     //update the post count in the user hash
    multi.HSET(`users:${currentUserId}`, 'postsCount', count);    //save back the property to the user hash
    multi.exec();     //then we'll execute all the commands defined right here
  } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');;
  }

  }

  public async getPostsFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const reply: string[] = await this.client.ZRANGE(key, start, end, {REV: true}); //zrange to get range of data
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {    //while looping through the list we'll get the HGETALl
        multi.HGETALL(`posts:${value}`);
      }
      const replies: PostCacheMultiType = await multi.exec() as PostCacheMultiType;  // until exec is called all teh values will be saved inside multi
      const postReplies: IPostDocument[] = [];

      for (const post of replies as IPostDocument[]) {    //casting below properties back to their original form
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
        postReplies.push(post);
      }
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');;
    }
  }

  //method to get total number of post from the cache
  public async getTotalPostsInCache(): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // We assume that the number of items in the sorted set will always be the same as the number of items
      // in our hash or the lengthy list of hashes.So we will just use the Z card to get from the sets.
      const count: number = await this.client.ZCARD('post');    // post is the name of the hash
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');;
    }
  }

  //method to get post with images
  public async getPostsWithImagesFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const reply: string[] = await this.client.ZRANGE(key, start, end, {REV: true}); //zrange to get range of data
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {    //while looping through the list we'll get the HGETALl
        multi.HGETALL(`posts:${value}`);
      }
      const replies: PostCacheMultiType = await multi.exec() as PostCacheMultiType;  // until exec is called all teh values will be saved inside multi
      const postWithImages: IPostDocument[] = [];

      // Post with images will have imageID abd imageVersion. Any hash having these 2 propes will be pushed into the list
      for (const post of replies as IPostDocument[]) {    //casting below properties back to their original form
        if (post.imgId && post.imgVersion || post.gifUrl) {
          post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
          postWithImages.push(post);
        }
      }
      return postWithImages;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');;
    }
  }

  //method that will return all the post of a particular user
  public async getUserPostsFromCache(key: string, uId: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const reply: string[] = await this.client.ZRANGE(key, uId, uId, {REV: true, BY: 'SCORE' }); //our score value is uId
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }
      const replies: PostCacheMultiType = await multi.exec() as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];

      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
        postReplies.push(post);
      }
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');;
    }
  }

  //method of total post of a single user
  public async getTotalUserPostsInCache(uId: number): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCOUNT('post', uId, uId);    // post is the name of the hash
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  //method to delete post from a cache
  public async deletePostFromCache(key: string, currentUserId: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.ZREM('post', `${key}`);   // delete item form sorted set key is basically value of sorted set
      multi.DEL(`posts:${key}`);    // delete the hash
      multi.DEL(`comments:${key}`);
      multi.DEL(`reactions:${key}`);
      const count: number = parseInt(postCount[0], 10) - 1;   // decrement the value of postCount
      multi.HSET(`users:${currentUserId}`, 'postsCount', count);
      await multi.exec();
    } catch (error) {
        log.error(error);
        throw new ServerError('Server error. Try again.');
    }
  }

  public async updatePostInCache(key: string, updatedPost: IPostDocument): Promise<IPostDocument> {
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture } = updatedPost;

    const dataToSave = {
      'post': `${post}`,
      'bgColor': `${bgColor}`,
      'feelings': `${feelings}`,
      'privacy': `${privacy}`,
      'gifUrl': `${gifUrl}`,
      // 'videoId': `${videoId}`,
      // 'videoVersion': JSON.stringify(videoVersion),
      'imgVersion': `${imgVersion}`,
      'imgId': `${imgId}`,
      'profilePicture': `${profilePicture}`,
    }
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // await this.client.HSET(`posts:${key}`, dataToSave);   // first save the updated hash
      for (const[itemKey, itemValue] of Object.entries(dataToSave)) {
        await this.client.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }

      //fetch the updated post
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.HGETALL(`posts:${key}`);
      const reply: PostCacheMultiType = await multi.exec() as PostCacheMultiType;
      const postReply = reply as IPostDocument[];
      postReply[0].commentsCount = Helpers.parseJson(`${postReply[0].commentsCount}`) as number;
      postReply[0].reactions = Helpers.parseJson(`${postReply[0].reactions}`) as IReactions;
      postReply[0].createdAt = Helpers.parseJson(`${postReply[0].createdAt}`) as Date;
      return postReply[0];  // return an updated hash and send it to the client
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

}
