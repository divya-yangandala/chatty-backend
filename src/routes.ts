import { authRoutes } from '@auth/routes/authRoutes';
import { currentUserRoutes } from '@auth/routes/currentRoutes';
import { authMiddleware } from '@global/helpers/auth-middleware';
import { postRoutes } from '@post/routes/postRoutes';
import { reactionRoutes } from '@reaction/routes/reactionRoutes';
import { serverAdapter } from '@service/queues/base.queue';
import { Application } from 'express';

const BASE_PATH = '/api/v1';

export default (app: Application) => {
  const routes = () => {
    // app.use('/api/v1'); later

    app.use('/queues', serverAdapter.getRouter()); // setting path for serverAdapter. Just for GUI
    app.use(BASE_PATH, authRoutes.routes());
    app.use(BASE_PATH, authRoutes.signOutRoutes());

    app.use(BASE_PATH, authMiddleware.verifyUser, currentUserRoutes.routes());
    // everytime this route is called it will check this verifyUser middleware for jwt token and then proceed

    app.use(BASE_PATH, authMiddleware.verifyUser, postRoutes.routes());

    app.use(BASE_PATH, authMiddleware.verifyUser, reactionRoutes.routes())
  };
  routes();
};
