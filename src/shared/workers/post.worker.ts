import { config } from "@root/config";
import { postService } from "@service/db/post.service";
import { DoneCallback, Job } from "bull";
import Logger from "bunyan";


const log: Logger = config.createLogger('postWorker');

class PostWorker {
  async savePostToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const {key, value } = job.data;
      //add to db
      await postService.addPostToDB(key, value);
      job.progress(100)
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async deletePostFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const {keyOne, keyTwo } = job.data;
      //add to db
      await postService.addPostToDB(keyOne, keyTwo);
      job.progress(100)
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async updatePostInDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const {key, value } = job.data;
      //update in db
      await postService.editPost(key, value);
      job.progress(100)
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const postWorker: PostWorker = new PostWorker();
