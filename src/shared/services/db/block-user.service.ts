import { UserModel } from '@user/models/user.schema';
import { PullOperator, PushOperator } from 'mongodb';
import mongoose from 'mongoose';

class BlockUserService {
  public async blockUser(userId: string, followerId: string): Promise<void> {
    UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(userId), blocked: { $ne: new mongoose.Types.ObjectId(followerId)} },
          update: {
            $push: {
              blocked: new mongoose.Types.ObjectId(followerId)
            } as PushOperator<Document>
          }
        }
      },
      {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(followerId), blockedBy: { $ne: new mongoose.Types.ObjectId(userId) } },
          update: {
            $push: {
              blockedBy: new mongoose.Types.ObjectId(userId)
            } as PushOperator<Document>
          }
        }
      }
    ])
  }

  public async unblockUser(userId: string, followerId: string): Promise<void> {
    UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(userId) },
          update: {
            $pull: {
              blocked: new mongoose.Types.ObjectId(followerId)
            } as PullOperator<Document>
          }
        }
      },
      {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(followerId) },
          update: {
            $pull: {
              blockedBy: new mongoose.Types.ObjectId(userId)
            } as PullOperator<Document>
          }
        }
      }
    ])
  }
}

export const blockUserService: BlockUserService = new BlockUserService();
