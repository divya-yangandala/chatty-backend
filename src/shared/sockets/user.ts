import { ILogin, ISocketData } from "@user/interfaces/user.interface";
import { Server, Socket } from "socket.io";

export let socketIOUserObject: Server;
export const connectedUsersMap: Map<string, string> = new Map();
let users: string[] = [];

export class SocketIOUserHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    socketIOUserObject = io;
  }

  public listen(): void {
    this.io.on('connection', (socket: Socket) => {

      socket.on('setup', (data: ILogin) => {
        this.addClientToMap(data.userId, socket.id);    // this userId will represent a userName and not an alphanumeric char
        this.addUser(data.userId);
        this.io.emit('user online', users);
      })

      socket.on('block user', (data: ISocketData) => {    // this event comes from the front-end
        this.io.emit('blocked user id', data);
      });

      socket.on('unblock user', (data: ISocketData) => {    // this event comes from the front-end
        this.io.emit('unblocked user id', data);
      })

      socket.on('disconnect', () => {
        this.removeClientFromMap(socket.id)
      })
    })
  }

  private addClientToMap(userId: string, socketId: string): void {
    if(!connectedUsersMap.has(userId)) {
      connectedUsersMap.set(userId, socketId);
    }
  }

  // The reason we're sending socketIs is once the user is disconnected we will not have username but only socketId
  private removeClientFromMap(socketId: string): void {
    if (Array.from(connectedUsersMap.values()).includes(socketId)) {
      const disconnectedUser: [string, string] = [...connectedUsersMap].find((user: [string, string]) => {
        return user[1] === socketId;
      }) as [string, string]
      connectedUsersMap.delete(disconnectedUser[0]);
      //send event to the client
      this.removeUser(disconnectedUser[0]);
      this.io.emit('user online', users); 
    }
  }

  //methods to add and remove users from users list

  private addUser(username: string): void {
    users.push(username);
    users = [...new Set(users)];
  }

  private removeUser(username: string): void {
    users = users.filter((name: string) => name != username);
  }

}
