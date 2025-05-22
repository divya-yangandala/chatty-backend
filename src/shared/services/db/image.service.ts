import { IFileImageDocument } from "@image/interfaces/image.interface";
import { ImageModel } from "@image/models/image.schema";
import { IUserDocument } from "@user/interfaces/user.interface";
import { UserModel } from "@user/models/user.schema";
import mongoose from "mongoose";

class ImageService {
  // update and create new profile image
  public async addUserProfileImageToDB(userId: string, url: string, imgId: string, imgVersion: string): Promise<void> {
    await UserModel.updateOne({ _id: userId }, { $set: { profilePicture: url } }).exec();
    await this.addImage(userId, imgId, imgVersion, 'profile');
  }

  // update and create new background image
  public async addUserBackgroundImageToDB(userId: string, imgId: string, imgVersion: string): Promise<void> {
    await UserModel.updateOne({ _id: userId }, { $set: { bgImageId: imgId, bgImageVersion: imgVersion } }).exec();
    await this.addImage(userId, imgId, imgVersion, 'background');
  }

  public async addImage(userId: string, imgId: string, imgVersion: string, type: string): Promise<void> {
    await ImageModel.create({
      userId,
      bgImageVersion: type === 'background' ? imgVersion : '',
      bgImageId: type === 'background' ? imgId : '',
      imgVersion,
      imgId
      // imgVersion: type === 'profile' ? imgVersion : '',
      // imgId: type === 'profile' ? imgId : ''

    });
  }

  public async removeImageFromDB(imageId: string): Promise<void> {
    await ImageModel.deleteOne({ _id: imageId }).exec();
  }

  // functions to retrieve images fom mongoDB
  public async getImageByBackgroundId(bgImageId: string): Promise<IFileImageDocument> {
    const image: IFileImageDocument = (await ImageModel.findOne({ bgImageId }).exec()) as IFileImageDocument;
    return image;
  }

  public async getImages(userId: string): Promise<IFileImageDocument[]> {
    const images: IFileImageDocument[] = await ImageModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) }}
    ]);
    return images;
  }

  public async resetBgImagePropertiesInUser(userId: string): Promise<void>{
    console.log(44444, userId)
    await UserModel.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { bgImageId: '', bgImageVersion: '' } }
    ).exec();
  }
}

export const imageService: ImageService = new ImageService();
