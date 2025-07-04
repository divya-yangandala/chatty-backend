import { Request, Response } from 'express';
import { authUserPayload } from '@root/mocks/auth.mock';
import { followersMockRequest, followersMockResponse } from '@root/mocks/followers.mock';
import { AddUser } from '@follower/controllers/block-user';
import { FollowersCache } from '@service/redis/followers.cache';
import { blockedUserQueue } from '@service/queues/blocked.queue';

jest.useFakeTimers();
jest.mock('@service/queues/base.queue');
jest.mock('@service/redis/followers.cache');

describe('AddUser', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('block', () => {
    it('should send correct json response', async () => {
      const req: Request = followersMockRequest({}, authUserPayload, { followerId: '6064861bc25eaa5a5d2f9bf4' }) as Request;
      const res: Response = followersMockResponse();
      jest.spyOn(FollowersCache.prototype, 'updateBlockedUserPropInCache');
      jest.spyOn(blockedUserQueue, 'addBlockedUserJob');

      await AddUser.prototype.block(req, res);
      expect(FollowersCache.prototype.updateBlockedUserPropInCache).toHaveBeenCalledWith(
        '6064861bc25eaa5a5d2f9bf4',
        'blockedBy',
        `${req.currentUser?.userId}`,
        'block'
      );
      expect(FollowersCache.prototype.updateBlockedUserPropInCache).toHaveBeenCalledWith(
        `${req.currentUser?.userId}`,
        'blocked',
        '6064861bc25eaa5a5d2f9bf4',
        'block'
      );
      expect(blockedUserQueue.addBlockedUserJob).toHaveBeenCalledWith('addBlockedUserToDB', {
        keyOne: `${req.currentUser?.userId}`,
        keyTwo: '6064861bc25eaa5a5d2f9bf4',
        type: 'block'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User blocked'
      });
    });
  });

  describe('unblock', () => {
    it('should send correct json response', async () => {
      const req: Request = followersMockRequest({}, authUserPayload, { followerId: '6064861bc25eaa5a5d2f9bf4' }) as Request;
      const res: Response = followersMockResponse();
      jest.spyOn(FollowersCache.prototype, 'updateBlockedUserPropInCache');
      jest.spyOn(blockedUserQueue, 'addBlockedUserJob');

      await AddUser.prototype.unblock(req, res);
      expect(FollowersCache.prototype.updateBlockedUserPropInCache).toHaveBeenCalledWith(
        '6064861bc25eaa5a5d2f9bf4',
        'blockedBy',
        `${req.currentUser?.userId}`,
        'unblock'
      );
      expect(FollowersCache.prototype.updateBlockedUserPropInCache).toHaveBeenCalledWith(
        `${req.currentUser?.userId}`,
        'blocked',
        '6064861bc25eaa5a5d2f9bf4',
        'unblock'
      );
      expect(blockedUserQueue.addBlockedUserJob).toHaveBeenCalledWith('removeBlockedUserFromDB', {
        keyOne: `${req.currentUser?.userId}`,
        keyTwo: '6064861bc25eaa5a5d2f9bf4',
        type: 'unblock'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User unblocked'
      });
    });
  });
});
