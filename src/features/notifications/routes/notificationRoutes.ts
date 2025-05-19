import express, { Router } from "express";
import { authMiddleware } from "@global/helpers/auth-middleware";
import { Update } from "@notification/controllers/update-notification";
import { Delete } from "@notification/controllers/delete-notification";
import { Get } from "@notification/controllers/get-notifications";


class NotificationRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.put('/notification/:notificationId', authMiddleware.checkAuthentication, Update.prototype.notification);
    this.router.delete('/notification/:notificationId', authMiddleware.checkAuthentication, Delete.prototype.notification);
    this.router.get('/notifications', authMiddleware.checkAuthentication, Get.prototype.notifications);

    return this.router;
  }
}


export const notificationRoutes: NotificationRoutes = new NotificationRoutes();
