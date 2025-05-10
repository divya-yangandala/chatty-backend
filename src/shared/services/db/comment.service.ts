import { ICommentDocument, ICommentJob, ICommentNameList, IQueryComment } from "@comment/interfaces/comment.interface";
import { CommentsModel } from "@comment/models/comment.schema";
import { IPostDocument } from "@post/interfaces/post.interface";
import { PostModel } from "@post/models/post.schema";
import { UserCache } from "@service/redis/user.cache";
import { IUserDocument } from "@user/interfaces/user.interface";
import { Query } from "mongoose";

const userCache: UserCache = new UserCache();

class CommentService {
  public async addCommentToDB(commentData: ICommentJob): Promise<void> {
    const { postId, userTo, userFrom, username, comment } = commentData;
    const comments: ICommentDocument = await CommentsModel.create(commentData);
    const post: Query<IPostDocument, IPostDocument> = await PostModel.findOneAndUpdate(
      { _id: postId },
      { $inc: { commentsCount: 1 } },
      { new: true }   // update and return updated data uisng new keyword
    ) as unknown as  Query<IPostDocument, IPostDocument>

    const user: Promise<IUserDocument> = userCache.getUserFromCache(userTo) as Promise<IUserDocument>;  // send notification to user
    const reponse: [ICommentDocument, IPostDocument, IUserDocument] = await Promise.all([comments, post, user]);

    // send comment notifications
  }

  // method to get single or multipe comments of a post
  public async getPostComments(query: IQueryComment, sort: Record<string , 1 |-1>): Promise<ICommentDocument[]> {
    const comments: ICommentDocument[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort }
    ]);
    return comments;
  }

  public async getPostCommentNames(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentNameList[]> {
    const commentNamesList: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
      { $group: {_id: null, names: { $addToSet: '$username'}, count: { $sum: 1 } } },
      { $project:  { _id: 0 } }
    ])
    return commentNamesList;
  }
}

export const commentService: CommentService = new CommentService();
