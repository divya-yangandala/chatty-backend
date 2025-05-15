import { IBlockedUserJobData } from './../../../features/followers/interfaces/follower.interface';
import { blockedUserWorker } from "@worker/blocked.worker";
import { BaseQueue } from "@service/queues/base.queue";


class BlockedUserQueue extends BaseQueue {
  constructor() {
    super('blockedUsers');
    this.processJob('addBlockedUserToDB', 5, blockedUserWorker.addBlockedUserToDB);
    this.processJob('removeBlockedUserFromDB', 5, blockedUserWorker.addBlockedUserToDB);
  }

  public addBlockedUserJob(name: string, data: IBlockedUserJobData): void {
    this.addJob(name, data);
  }
}

export const blockedUserQueue: BlockedUserQueue = new BlockedUserQueue();
