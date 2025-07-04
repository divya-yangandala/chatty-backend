import { updatedPost } from './../../../mocks/post.mock';
import { IGetPostsQuery, IPostDocument, IQueryComplete, IQueryDeleted } from "@post/interfaces/post.interface";
import { PostModel } from "@post/models/post.schema";
import { IUserDocument } from "@user/interfaces/user.interface";
import { UserModel } from "@user/models/user.schema";
import { Query, UpdateQuery } from "mongoose";

class PostService {
  public async addPostToDB(userId: string, createdPost: IPostDocument): Promise<void> {
    const post: Promise<IPostDocument> = PostModel.create(createdPost);
    const user: UpdateQuery<IUserDocument> = UserModel.updateOne({_id: userId}, {$inc: {postsCount: 1 }});
    // const post = PostModel.create(createdPost);
    // const user = UserModel.updateOne({_id: userId}, {$inc: {postsCount: 1 }});
    await Promise.all([post, user]);
  }

  public async getPosts(query: IGetPostsQuery, skip: 0 | number, limit: 0 | number, sort: Record<string, 1 | -1>): Promise<IPostDocument[]> {
    let postQuery = {};
    if (query?.imgId && query?.gifUrl) {    // If query has imageId get all posts of that imageId
      postQuery = {$or: [{ imgId: {$ne: ''} }, { gifUrl: {$ne: ''} }]}
    } else if (query?.videoId) {      // If query has videoId get all posts of that videoId
      postQuery = { videoId: {$ne: ''} }
    } else {          // else return all posts
      postQuery = query;
    }

    const posts: IPostDocument[] = await PostModel.aggregate([
      { $match: postQuery  },
      {  $sort: sort },
      {  $skip: skip },
      {  $limit: limit }
    ]);
    return posts;
  }

  public async postsCount(): Promise<number> {
    const count: number = await PostModel.find({}).countDocuments();
    // const count: number = await PostModel.countDocuments();
    return count;
  }

  public async deletePost(postId: string, userId: string): Promise<void> {
    const deletePost: Query<IQueryComplete & IQueryDeleted, IPostDocument> = PostModel.deleteOne({ _id: postId });
    //delete reactions here
    const decrementPostCount: UpdateQuery<IUserDocument> = UserModel.updateOne({ _id: userId }, { $inc: { postsCount: -1 } });
    await Promise.all([deletePost, decrementPostCount]);
  }

  public async editPost(postId: string, updatedPost: IPostDocument): Promise<void> {
    const updatePost: UpdateQuery<IPostDocument> = UserModel.updateOne({ _id: postId }, { $set: updatedPost });
    await Promise.all([updatePost]);
  }

}

export const postService: PostService = new PostService();
