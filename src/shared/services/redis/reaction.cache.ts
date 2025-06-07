import { IReactionDocument, IReactions } from './../../../features/reactions/interfaces/reaction.interface';
import { BaseCache } from "@service/redis/base.cache";
import { config } from '@root/config';
import Logger from 'bunyan';
import { find } from 'lodash';
//import _ from 'lodash'      //and use it like _.find()
import { Helpers } from "@global/helpers/helpers";
import { ServerError } from '@global/helpers/error-handler';

const log: Logger = config.createLogger('ReactionCache');

export class ReactionCache extends BaseCache {

  constructor() {
    super('reactionCache');
  }

  public async savePostReactionToCache(
    key: string,
    reaction: IReactionDocument,
    postReactions: IReactions,
    type: string,
    previousReaction: string
  ): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      if (previousReaction) {   // we're most likely implemnting this via front-end I doubt
        //call remove reaction method
        this.removePostReactionFromCache(key, reaction.username, postReactions);
      }

      // we are gonna a have a top level reaction like:-
      // 'reactions'
      //   '65776721010': ['huiwii', 'yyuuywi'];

      if (type) {
        await this.client.LPUSH(`reactions:${key}`, JSON.stringify(reaction));    // this ia list
        // const dataToSave: string[] = ['reactions', JSON.stringify(postReactions)];  // updating the reaction in the POSTS and postReacctions is coming from the client
        await this.client.HSET(`posts:${key}`,'reactions', JSON.stringify(postReactions));   // saving using HSET beacuse POST is a hash
      }

    } catch (error) {
        log.error(error);
        throw new ServerError('Server error. Try again.');
    }

  }

  //method to update Reaction
  public async removePostReactionFromCache(key: string, username: string, postReactions: IReactions): Promise<void> {
    try {
      if(!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(`reactions:${key}`, 0, -1);   // Get all the reactions first in list using LRANGE for sets we use ZRANGE; -1 means  all
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      const userPreviousReaction: IReactionDocument = this.getPreviousReaction(response, username) as IReactionDocument;
      multi.LREM(`reactions:${key}`, 1, JSON.stringify(userPreviousReaction)); // (key, noOfItemToRemove, itemToRemove);
      await multi.exec();

      // const dataToSave: string[] = ['reactions', JSON.stringify(postReactions)];  // postReactions is coming from the client
      await this.client.HSET(`posts:${key}`, 'reactions', JSON.stringify(postReactions));
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // method to retrieve all reactions at at time fro a particular post
  public async getReactionsFromCache(postId: string): Promise<[IReactionDocument[], number]> {
    try {
      if(!this.client.isOpen) {
        await this.client.connect();
      }
      const reactionCount: number = await this.client.LLEN(`reactions:${postId}`);  // fetch count of reactions in an Post
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);  // featch all reactiosn from a list
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item));
      }
      return response.length ? [list, reactionCount] : [[], 0];
      // return response.length ? [list, list.length] : [[], 0];  // we could have wrote like this too
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // method to get a single reaction based by username
  public async getSingleReactionByUsernameFromCache(postId: string, username: string): Promise<[IReactionDocument, number] | []> {
    try {
      if(!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);  // featch all reactiosn from a list
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item));
      }

      const result: IReactionDocument = find(list, (listItem: IReactionDocument) => {
        return listItem.postId === postId && listItem.username === username
      }) as IReactionDocument

      return result ? [result, 1] : [];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // we are using username to getPreviuosReaction on post and to remove it because a user will have ony one reaction
  private getPreviousReaction(response: string[], username: string): IReactionDocument | undefined {
    const list: IReactionDocument[] = [];
    for (const item of response) {
      list.push(Helpers.parseJson(item) as IReactionDocument);
    }
    // So any object or reaction document that has this username or its username equal to the
    // username we are passing right here.
    return find(list, (listItem: IReactionDocument)  => {
      return listItem.username === username;
    })
  }



}
