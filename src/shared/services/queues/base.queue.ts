import { Callback } from './../../../../node_modules/@types/redis/index.d';
import Queue, { Job } from 'bull';
import Logger from 'bunyan';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from '@root/config';
import { IAuthJob } from '@auth/interfaces/auth.interface';
import { IEmailJob } from '@user/interfaces/user.interface';
import { IPostJobData } from '@post/interfaces/post.interface';
import { IReactionJob } from '@reaction/interfaces/reaction.interface';
import { ICommentJob } from '@comment/interfaces/comment.interface';
import { IFollowerJobData } from '@follower/interfaces/follower.interface';
import { INotificationJobData } from '@notification/interfaces/notification.interface';

type IBaseJobData = IAuthJob | IEmailJob | IPostJobData | IReactionJob | ICommentJob | IFollowerJobData | INotificationJobData;

let bullAdapters: BullAdapter[] = [];

export let serverAdapter: ExpressAdapter;

export abstract class BaseQueue {
  queue: Queue.Queue;
  log: Logger;

  constructor(queueName: string) {
    this.queue = new Queue(queueName, `${config.REDIS_HOST}`); //every queue we are creating we're passing to the bull adapter
    bullAdapters.push(new BullAdapter(this.queue));
    bullAdapters = [...new Set(bullAdapters)];
    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    createBullBoard({
      queues: bullAdapters,
      serverAdapter
    });

    this.log = config.createLogger(`${queueName}Queue`);

    //events we can listen on queue
    this.queue.on('completed', (job: Job) => {
      // job.remove();   // we can comment this out to see the completed job in GUI
    });

    this.queue.on('global:completed', (jobId: string) => {
      this.log.info(`Job ${jobId} completed`);
    });

    this.queue.on('global:stalled', (jobId: string) => {
      this.log.info(`Job ${jobId} stalled`);
    });
  }

  //Methods to allow us add data to the queue and also to process jobs inside the queue.

  protected addJob(name: string, data: IBaseJobData): void {
    this.queue.add(name, data, { attempts: 3, backoff: { type: 'fixed', delay: 5000 } });
  }
  // attempts is no. of failed job it will re-attempt here it is set to 3;
  // delay means after 5 seconds job will be re-attempt

  protected processJob(name: string, concurrency: number, callback: Queue.ProcessCallbackFunction<void>): void {
    this.queue.process(name, concurrency, callback);
  }

  //concurrency is no. of job the queue will process at a given time say 5 at at time
  // and say one job completes it will add one job from queue to maintain concurrency
}
