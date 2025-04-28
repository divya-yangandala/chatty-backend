import { IPostDocument } from "@post/interfaces/post.interface";
import { postService } from "@service/db/post.service";
import { PostCache } from "@service/redis/post.cache";
import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';


const postCache: PostCache = new PostCache();
const PAGE_SIZE = 10;

export class Get {
  public async posts(req: Request, res: Response) {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page)  //maybe wrong
    const newSkip: number = skip === 0 ? skip: skip + 1;
    // So this new skip property will be used as the starting value for getting the data from the redis cache.
    // While the skip and the limits will be used for getting data from MongoDB.
    let posts: IPostDocument[] = [];
    let totalPosts = 0;
    // get post data from cache
    const cachedPosts: IPostDocument[] = await postCache.getPostsFromCache('post', newSkip, limit);
    if (cachedPosts.length) {
      posts = cachedPosts;
      totalPosts = await postCache.getTotalPostsInCache();
    } else {
      posts = await postService.getPosts({}, skip, limit, {createdAt: -1});
      totalPosts = await  postService.postsCount();
    }
    res.status(HTTP_STATUS.OK).json({ message: 'All posts', posts, totalPosts})   // shorhand prop:- posts: posts
  }

  public async postsWithImages(req: Request, res: Response) {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page)  //maybe wrong
    const newSkip: number = skip === 0 ? skip: skip + 1;
    // So this new skip property will be used as the starting value for getting the data from the redis cache.
    // While the skip and the limits will be used for getting data from MongoDB.
    let posts: IPostDocument[] = [];
    // get post data from cache
    const cachedPosts: IPostDocument[] = await postCache.getPostsWithImagesFromCache('post', newSkip, limit);

    // We did not create any post to get or any method to get the only the total post with images.
    // We can decide to use this or I can just remove it. Maybe not implement any pagination for this.let's just leave this for now.
    // if (cachedPosts.length) {
    //   posts = cachedPosts;
    //   totalPosts = await postCache.getTotalPostsInCache();
    // } else {
    //   posts = await postService.getPosts({ imgId: '$ne', gifUrl: '$ne'}, skip, limit, {createdAt: -1});
    //   totalPosts = await  postService.postsCount();
    // }
    posts = cachedPosts.length ? cachedPosts : await postService.getPosts({ imgId: '$ne', gifUrl: '$ne'}, skip, limit, {createdAt: -1});
    res.status(HTTP_STATUS.OK).json({ message: 'All posts with images', posts})   // shorhand prop:- posts: posts
  }
}
