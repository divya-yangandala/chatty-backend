import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import { joiValidation } from "@global/decorators/joi-validation.decorator";
import { IPostDocument } from "@post/interfaces/post.interface";
import { postSchema, postWithImageSchema, postWithVideoSchema } from "@post/schemes/post.scheme";
import { postQueue } from "@service/queues/post.queue";
import { PostCache } from "@service/redis/post.cache";
import { SocketIOPostHandler, socketIOPostObject } from "@socket/post";
import { ObjectId } from "mongodb";
import { UploadApiResponse } from "cloudinary";
import { uploads, videoUpload } from '@global/helpers/cloudinary-upload';
import { BadRequestError } from "@global/helpers/error-handler";
import { imageQueue } from "@service/queues/image.queue";

const postCache: PostCache = new PostCache();

export class Create {
  @joiValidation(postSchema)
  public async post(req: Request, res: Response): Promise<void> {
    const {post, bgColor, privacy, gifUrl, profilePicture, feelings} = req.body;
    const postObjectId: ObjectId = new ObjectId();

    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount : 0,
      imgVersion: '',
      imgId: '',
      videoId: '',
      videoVersion: '',
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, wow: 0, sad: 0, angry: 0}
    } as IPostDocument;

    socketIOPostObject.emit('add post', createdPost);
    //here wer are emiiting the add post event as soon as post is added. User will be able to see the data even before it is saved to the cache or DB

    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    })

    postQueue.addPostJob('addPostToDB', {key: req.currentUser!.userId, value: createdPost});

    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created successfully'});
  }

  //post with an image method
  @joiValidation(postWithImageSchema)
  public async postWithImage(req: Request, res: Response): Promise<void> {
    const {post, bgColor, privacy, gifUrl, profilePicture, feelings, image} = req.body;
    const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;
        if (!result?.public_id) {
          throw new BadRequestError('File upload: Error occurred. Try again');
        }
    const postObjectId: ObjectId = new ObjectId();

    console.log("req   ", req.currentUser);
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount : 0,
      imgVersion: result.version.toString(),
      imgId: result.public_id,
      videoId: '',
      videoVersion: '',
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, wow: 0, sad: 0, angry: 0}
    } as IPostDocument;

    socketIOPostObject.emit('add post', createdPost);
    //here wer are emiiting the add post event as soon as post is added. User will be able to see the data even before it is saved to the cache or DB

    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    })

    postQueue.addPostJob('addPostToDB', {key: req.currentUser!.userId, value: createdPost});
    // we need to add the image to our Image collection in DB for now just adding the comment
    // call image queue to add image to mongo DB

    imageQueue.addImageJob('addImageToDB', {
      key: `${req.currentUser!.userId}`,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    });

    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created with image successfully'});
  }

  @joiValidation(postWithVideoSchema)
  public async postWithVideo(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, video } = req.body;

    const result: UploadApiResponse = (await videoUpload(video)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount : 0,
      imgVersion: '',
      imgId: '',
      videoId: result?.public_id,
      videoVersion: result.version.toString(),
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, wow: 0, sad: 0, angry: 0}
    } as IPostDocument;
    socketIOPostObject.emit('add post', createdPost);
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });
    // we are not having and VideoQueue just like imageQueue
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created with video successfully' });

  }

}
