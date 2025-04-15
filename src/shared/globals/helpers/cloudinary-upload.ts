import cloudinary, { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export function uploads(
  file: string,
  public_id?: string,
  overwrite?: boolean,
  invalidate?: boolean
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    // not using reject beacuse we want to handle error wherever we are going to use this method upload
    cloudinary.v2.uploader.upload(
      // 3rgs of upload function are :- file, optional params and an optional callback
      file,
      {
        public_id, // shorthand properties: public-id: public_id
        overwrite,
        invalidate
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(result);
      }
    );
  });
}
