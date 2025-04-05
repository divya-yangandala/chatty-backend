import express, { Express } from 'express';
import { ChattyServer } from './setupServer';
import databaseConnection from './setupDatabase';
import { config } from './config'

// To use the start method from setupServer.ts file we are creating a class Application

class Application {
    public initialize() : void {
        this.loadConfig();
        databaseConnection();   // first we'll connect to database
        const app: Express = express();
        const server: ChattyServer = new ChattyServer(app);   // since we are passing express app inside constructor
        server.start();     //calling public method
    }

    private loadConfig(): void {
        config.validateConfig();
    }

}

const application: Application = new Application();
application.initialize();
