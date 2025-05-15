import { Request, Response } from 'express';
import { authUserPayload } from '@root/mocks/auth.mock';
import { followersMockRequest, followersMockResponse } from '@root/mocks/followers.mock';
import { existingUser } from '@root/mocks/user.mock';
import { followerQueue } from '@service/queues/follower.queue';
import { FollowersCache } from '@service/redis/followers.cache';
import { Remove } from '@follower/controllers/unfollow-user';

jest.useFakeTimers();
jest.mock('@service/queues/base.queue');
jest.mock('@service/redis/follower.cache');

describe('Remove', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should send correct json response', async () => {
    const req: Request = followersMockRequest({}, authUserPayload, {
      followerId: '6064861bc25eaa5a5d2f9bf4',
      followeeId: `${existingUser._id}`
    }) as Request;
    const res: Response = followersMockResponse();
    jest.spyOn(FollowersCache.prototype, 'removeFollowerFromCache');
    jest.spyOn(FollowersCache.prototype, 'updateFollowersCountInCache');
    jest.spyOn(followerQueue, 'addFollowerJob');

    await Remove.prototype.follower(req, res);
    expect(FollowersCache.prototype.removeFollowerFromCache).toHaveBeenCalledTimes(2);
    expect(FollowersCache.prototype.removeFollowerFromCache).toHaveBeenCalledWith(
      `following:${req.currentUser!.userId}`,
      req.params.followeeId
    );
    expect(FollowersCache.prototype.removeFollowerFromCache).toHaveBeenCalledWith(
      `followers:${req.params.followeeId}`,
      req.params.followerId
    );
    expect(FollowersCache.prototype.updateFollowersCountInCache).toHaveBeenCalledTimes(2);
    expect(FollowersCache.prototype.updateFollowersCountInCache).toHaveBeenCalledWith(`${req.params.followeeId}`, 'followersCount', -1);
    expect(FollowersCache.prototype.updateFollowersCountInCache).toHaveBeenCalledWith(`${req.params.followerId}`, 'followingCount', -1);
    expect(followerQueue.addFollowerJob).toHaveBeenCalledWith('removeFollowerFromDB', {
      keyOne: `${req.params.followeeId}`,
      keyTwo: `${req.params.followerId}`
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unfollowed user now'
    });
  });
});
