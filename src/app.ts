import express, { Express } from 'express';
import { ChattyServer } from '@root/setupServer';
import databaseConnection from '@root/setupDatabase';
import { config } from '@root/config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('app');

// To use the start method from setupServer.ts file we are creating a class Application

class Application {
  public initialize(): void {
    this.loadConfig();
    databaseConnection(); // first we'll connect to database
    const app: Express = express();
    const server: ChattyServer = new ChattyServer(app); // since we are passing express app inside constructor
    server.start(); //calling public method
  }

  private loadConfig(): void {
    config.validateConfig();
    config.cloudinaryConfig();
  }

  private static handleExit(): void {
    process.on('uncaughtException', (error: Error) => {
      log.error(`There was a uncaught error: ${error}`);
      Application.shutDownProperly(1);
    })

    process.on('unhandleRejection', (reason: Error) => {
      log.error(`Unhandled rejection at promise: ${reason}`);
      Application.shutDownProperly(2);
    })

     process.on('SIGTERM', () => {     // Signal Termination
      log.error('Caught SIGTERM');
      Application.shutDownProperly(2);
    })

    process.on('SIGINT', () => {     // Signals Intelligence
      log.error('Caught SIGINT');
      Application.shutDownProperly(2);
    })

    process.on('exit', () => {
      log.error('exiting');
    })
  }

  private static shutDownProperly(exitCode: number): void {
    Promise.resolve()
      .then(() => {
        log.info('Shutdown complete');
        process.exit(exitCode);
      })
      .catch((error) => {
        log.error(`Error during shutdown: ${error}`);
        process.exit(1);
      })
  }

}

const application: Application = new Application();
application.initialize();
