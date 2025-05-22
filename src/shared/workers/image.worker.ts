import { config } from "@root/config";
import { imageService } from "@service/db/image.service";
import { DoneCallback, Job } from "bull";
import Logger from "bunyan";


const log: Logger = config.createLogger('imageWorker')

class ImageWorker {
  async addUserProfileImageToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value, imgId, imgVersion } = job.data;
      await imageService.addUserProfileImageToDB(key, value, imgId, imgVersion);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async updateBGImageInDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key,imgId, imgVersion } = job.data;
      await imageService.addUserBackgroundImageToDB(key,imgId, imgVersion);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async addImageToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key,imgId, imgVersion } = job.data;
      await imageService.addImage(key,imgId, imgVersion, ''); // the reason we're stting image type to '' is we can use it to store any image except for the BgImage
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async removeImageFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { imageId } = job.data;
      await imageService.removeImageFromDB(imageId);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  // async resetBgImage(job: Job, done: DoneCallback): Promise<void> {
  //   try {
  //     const { userId } = job.data;
  //     await imageService.resetBgImagePropertiesInUser(userId);
  //   } catch (error) {
  //     log.error(error);
  //     done(error as Error);
  //   }
  // }

}

export const imageWorker: ImageWorker = new ImageWorker();
