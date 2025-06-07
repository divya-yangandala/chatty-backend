import { IAuthJob } from '@auth/interfaces/auth.interface';
import { BaseQueue } from "@service/queues/base.queue";
import { authWorker } from '@worker/auth.worker';

class AuthQueue extends BaseQueue {
  constructor() {
    super('auth');
    this.processJob('addAuthUserToDB', 5, authWorker.addAuthUserToDB); //this method will be use to process job in the queue
  }

  //this method will add the job to the queue
  public addAuthUserJob(name: string, data: IAuthJob): void {
    this.addJob(name, data);
  }
}

export const authQueue: AuthQueue = new AuthQueue();
