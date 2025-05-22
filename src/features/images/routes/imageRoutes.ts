import { authMiddleware } from "@global/helpers/auth-middleware";
import { Add } from "@image/controllers/add-image";
import { Delete } from "@image/controllers/delete-image";
import { Get } from "@image/controllers/get-images";
import express, { Router } from "express";


class ImageRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get('/images/:userId', authMiddleware.checkAuthentication, Get.prototype.images);

    this.router.post('/images/profile', authMiddleware.checkAuthentication, Add.prototype.profileImage);
    this.router.post('/images/background', authMiddleware.checkAuthentication, Add.prototype.backgroundImage);

    this.router.delete('/images/:imageId', authMiddleware.checkAuthentication, Delete.prototype.image);
    this.router.delete('/images/background/:imageId', authMiddleware.checkAuthentication, Delete.prototype.backgroundImage);

    return this.router;
  }
}

export const imageRoutes: ImageRoutes = new ImageRoutes();
