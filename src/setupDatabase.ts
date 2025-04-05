// You already know we are using MongoDB and we are going to use Mongoose as the object, relational model or tool.
// So we're not going to be directly communicating with MongoDB by writing MongoDB code.

import mongoose from "mongoose";
import { config } from "./config";
import Logger from "bunyan";

const log: Logger = config.createLogger('setUpDatabase')

export default () => {
    const connect  = () => {
        mongoose.connect(`${config.DATABASE_URL}`)
            .then(() => {
                log.info("Successfully connected to database.");
            })
            .catch((error) => {
                log.error('Error connecting to database', error);
                return process.exit(1)
            })        
    }
    connect();

    mongoose.connection.on("disconnected", connect);    // if DB disconnects we'll try to connect it again
}