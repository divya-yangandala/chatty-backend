import { IPostJobData } from '@post/interfaces/post.interface';
import { BaseQueue } from './base.queue';
import { postWorker } from '@worker/post.worker';

class PostQueue extends BaseQueue {
  constructor() {
    super('post');
    this.processJob('addPostToDB', 5, postWorker.savePostToDB);
    this.processJob('deletepostFromDB', 5, postWorker.deletePostFromDB);
    this.processJob('updatePostInDB', 5, postWorker.updatePostInDB);
  }

  public addPostJob(name: string, data: IPostJobData) {
    this.addJob(name, data);
  }
}

export const postQueue: PostQueue = new PostQueue();
