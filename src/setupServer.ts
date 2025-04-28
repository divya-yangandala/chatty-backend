import { Application, json, urlencoded, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression'; // use to compress our req and res
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import 'express-async-errors';
import { config } from '@root/config';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import applicationRoutes from '@root/routes';
import Logger from 'bunyan';
import { IErrorResponse, CustomError } from '@global/helpers/error-handler';
import { SocketIOPostHandler } from '@socket/post';

//app.use() is used to call amiddleware in express

const SERVER_PORT = 5000;

// create my Logger

const log: Logger = config.createLogger('setUpServer');

export class ChattyServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.globalErrorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application): void {
    app.use(
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
        maxAge: 24 * 7 * 3600000,
        secure: config.NODE_ENV !== 'development'
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      })
    );
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({ limit: '50mb' })); // req data must not exceed 50mb
    app.use(urlencoded({ extended: true, limit: '50mb' }));
  }

  private routesMiddleware(app: Application): void {
    applicationRoutes(app);
  }

  private globalErrorHandler(app: Application): void {
    app.all('*', (req: Request, res: Response) => {
      // I express for urls which are not yet defined and for all url we'll use app.all("*")
      res.status(HTTP_STATUS.NOT_FOUND).json({ maessage: `${req.originalUrl} not found` });
    });

    // to use custom error classes
    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction): void => {
      // console.log(error);
      log.error(error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(error.serializeErrors());
      }
      //If no error just call the next function
      next();
    });
  }

  private async startServer(app: Application): Promise<void> {
    //create server
    try {
      const httpServer: http.Server = new http.Server(app); //created instance of http server
      const socketIO: Server = await this.createSocketIO(httpServer);
      this.startHttpServer(httpServer); // pass this instance into startHttpServer
      this.socketIOConnections(socketIO);
    } catch (error) {
      log.error(error);
    }
  }

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    // so.. instead of returning vois we'll return Server
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      }
    });
    const pubClient = createClient({ url: config.REDIS_HOST }); // create cleint for publishing
    const subClient = pubClient.duplicate(); // create cleint for subscription
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    return io; // io is of type Server so
  }

  private startHttpServer(httpServer: http.Server): void {
    log.info(`Server has started with process ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Server running on port ${SERVER_PORT}`);
    });
  }

  // creating a private method so that we can define all socket IO classes we are going to create

  private socketIOConnections(io: Server): void {
    const postSocketHandler: SocketIOPostHandler = new SocketIOPostHandler(io);
    postSocketHandler.listen();
  }
}
