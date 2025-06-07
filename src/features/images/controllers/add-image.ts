import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import { uploads } from "@global/helpers/cloudinary-upload";
import { UploadApiResponse } from "cloudinary";
import { BadRequestError } from "@global/helpers/error-handler";
import { IUserDocument } from "@user/interfaces/user.interface";
import { UserCache } from "@service/redis/user.cache";
import { socketIOImageObject } from "@socket/image";
import { imageQueue } from "@service/queues/image.queue";
import { IBgUploadResponse } from "@image/interfaces/image.interface";
import { Helpers } from "@global/helpers/helpers";
import { joiValidation } from "@global/decorators/joi-validation.decorator";
import { addImageSchema } from "@image/schemes/images";


const userCache: UserCache = new UserCache();

export class Add {
  @joiValidation(addImageSchema)
  public async profileImage(req: Request, res: Response): Promise<void> {
    const result: UploadApiResponse = (await uploads(req.body.image, req.currentUser!.userId, true, true)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError('File upload: Error occurred. Try again.');
    }
    //once upload is successful we construct new url
    const url = `https://res.cloudinary.com/dnzbnwqfd/image/upload/v${result.version}/${result.public_id}`;
    const cachedUser: IUserDocument = await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'profilePicture',
      url
    ) as IUserDocument;       // update profilePicture prop in cache
    socketIOImageObject.emit('update user', cachedUser);
    imageQueue.addImageJob('addUserProfileImageToDB', {
      key: `${req.currentUser!.userId}`,
      value: url,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    })
    res.status(HTTP_STATUS.OK).json({ message: 'Image added successfully'});
  }


  public async backgroundImage(req: Request, res: Response): Promise<void> {
    const { version, publicId }: IBgUploadResponse = await Add.prototype.backgroundUpload(req.body.image);
    const bgImageId: Promise<IUserDocument> = userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageId',
      publicId
    ) as Promise<IUserDocument>;
    const bgImageVersion: Promise<IUserDocument> = userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageVersion',
      version
    ) as Promise<IUserDocument>;
    console.log(22222, bgImageId, bgImageVersion);
    const response: [IUserDocument, IUserDocument] = await Promise.all([bgImageId, bgImageVersion]) as [IUserDocument, IUserDocument];

    socketIOImageObject.emit('update user', {
      bgImageId: publicId,
      bgImageVersion: version,
      userId: response[0]
    });
    imageQueue.addImageJob('updateBGImageInDB', {
      key: `${req.currentUser!.userId}`,
      imgId: publicId,
      imgVersion: version.toString()
    });
    res.status(HTTP_STATUS.OK).json({ message: 'Image added successfully' });
  }

  private async backgroundUpload(image: string): Promise<IBgUploadResponse> {
    const isDataURL = Helpers.isDataURL(image);   // to check whether image is base64
    let version = '';
    let publicId = '';
    // It will cehck if user is uploading a new image and it will of type base64 or it will check if user is uploading already uploaded image
    if (isDataURL) {
      const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      } else {
        version = result.version.toString();
        publicId = result.public_id;
      }
    } else {    // If a user is uploading uploaded image we already get version and publicId
      const value = image.split('/');
      version = value[value.length - 2];
      publicId = value[value.length - 1];
    }     // later we goanna update the version and publicId inside bgImgId and bgImgVersion props
    return { version: version.replace(/v/g, ''), publicId }
  }
}
