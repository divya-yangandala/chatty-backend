import { config } from "@root/config";
import Logger from "bunyan";
import { BaseCache } from "@service/redis/base.cache";
import { ServerError } from "@global/helpers/error-handler";
import { filter, find, findIndex, remove } from "lodash";
import { IChatList, IChatUsers, IGetMessageFromCache, IMessageData } from "@chat/interfaces/chat.interface";
import { Helpers } from "@global/helpers/helpers";
import { IReaction } from "@reaction/interfaces/reaction.interface";



const log: Logger = config.createLogger('messageCache');

export class MessageCache extends BaseCache {

  constructor() {
    super('messageCache');
  }

  public async addChatListToCache(senderId: string, receiverId: string, conversationId: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      if (userChatList.length === 0) {
        await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId}));
      } else {
        const receiverIndex: number = findIndex(userChatList, (listItem: string) => listItem.includes(receiverId));
        if (receiverIndex < 0) {
          await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId}))
        }
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async addChatMessageToCache(conversationId: string, value: IMessageData): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.RPUSH(`messages:${conversationId}`, JSON.stringify(value));

    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // Add chat users to List
  public async addChatUsersToCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const users: IChatUsers[] = await this.getChatUsersList();    // each item inside the users is stringify
      // we are saving IchatUsers userOne and userTwo as stringify object we'll check if there's a tring that contain both properties
      const usersIndex: number = findIndex(users, (listItem: IChatUsers) => JSON.stringify(listItem) === JSON.stringify(value));
      let chatUsers: IChatUsers[] = [];
      if (usersIndex === -1) {    // this means both users don't exist in the list
        await this.client.RPUSH('chatUsers', JSON.stringify(value));
        chatUsers = await this.getChatUsersList();
      } else {
        chatUsers = await this.getChatUsersList();
      }
      return chatUsers;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async removeChatUsersFromCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const users: IChatUsers[] = await this.getChatUsersList();
      const usersIndex: number = findIndex(users, (listItem: IChatUsers) => JSON.stringify(listItem) === JSON.stringify(value));
      let chatUsers: IChatUsers[] =  [];
      if (usersIndex > -1) {
        await this.client.LREM('chatUsers', usersIndex, JSON.stringify(value));
        chatUsers = await this.getChatUsersList();
      } else {
        chatUsers = await this.getChatUsersList();
      }
      return chatUsers;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // this method will return the last message from a Messages conversationList in the cache
  public async getUserConversationList(key: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${key}`, 0, -1);
      const conversationChatList: IMessageData[] = [];
      for (const item of userChatList) {
        const chatItem: IChatList = Helpers.parseJson(item) as IChatList;
        const lastMessage: string = await this.client.LINDEX(`messages:${chatItem.conversationId}`, -1) as string;    // only to get last message from the conversation
        conversationChatList.push(Helpers.parseJson(lastMessage));
      }
      return conversationChatList;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getChatMessagesFromCache(senderId: string, receiverId: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
      const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
      if (parsedReceiver) {
        const userMessages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
        const chatMessages: IMessageData[] = [];
        for (const item of userMessages) {
          const chatItem = Helpers.parseJson(item);
          chatMessages.push(chatItem);
        }
        return chatMessages
      } else {
        return [];
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async markMessageAsDeleted(senderId: string, receiverId: string, messageId: string, type: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const { index, message, receiver } = await this.getMessage(senderId, receiverId, messageId);
      const chatItem = Helpers.parseJson(message) as IMessageData;
      if (type === 'deleteForMe') {
        chatItem.deleteForMe = true;
      } else {
        chatItem.deleteForMe = true;
        chatItem.deleteForEveryone = true;
      }
      // setting back the updated properties
      await this.client.LSET(`messages:${receiver.conversationId}`, index, JSON.stringify(chatItem));

      // we can simply rote like this skipping below:--   return chatItem;
      const lastMessage: string = await this.client.LINDEX(`messages:${receiver.conversationId}`, index) as string;   // fetching the last item
      return Helpers.parseJson(lastMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async updateChatMessages(senderId: string, receiverId: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
      const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
      const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
      const unreadMessages: string[] = filter(messages, (listItem: string) => !Helpers.parseJson(listItem).isRead)  // to get all false values
      console.log("unreadMessages:  ", unreadMessages);
      for (const item of unreadMessages) {
        const chatItem = Helpers.parseJson(item) as IMessageData;
        console.log(222222, chatItem)
        const index = findIndex(messages, (listItem: string) =>  listItem.includes(`${chatItem._id}`));
        console.log("index:  ", index);
        chatItem.isRead = true;
        await this.client.LSET(`messages:${chatItem.conversationId}`, index, JSON.stringify(chatItem));
      }
      const lastMessage: string = await this.client.LINDEX(`messages:${parsedReceiver.conversationId}`, -1) as string;    // this -1 will return last message to the client
      return Helpers.parseJson(lastMessage) as IMessageData;
    } catch (error) {
       log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

    public async updateMessageReaction(
    conversationId: string,
    messageId: string,
    reaction: string,
    senderName: string,
    type: 'add' | 'remove'
  ): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const messages: string[] = await this.client.LRANGE(`messages:${conversationId}`, 0, -1);
      const messageIndex: number = findIndex(messages, (listItem: string) => listItem.includes(messageId));   // get the index
      const message: string = await this.client.LINDEX(`messages:${conversationId}`, messageIndex) as string; // get the message at that particular index
      const parsedMessage: IMessageData = Helpers.parseJson(message) as IMessageData;
      const reactions: IReaction[] = [];
      if (parsedMessage) {
        remove(parsedMessage.reaction, (reaction: IReaction) => reaction.senderName === senderName);  //remove any reaction that matches the senderName
        if (type === 'add') {
          reactions.push({ senderName, type: reaction});
          parsedMessage.reaction = [...parsedMessage.reaction, ...reactions];
          await this.client.LSET(`messages:${conversationId}`, messageIndex, JSON.stringify(parsedMessage));
        } else {
          await this.client.LSET(`messages:${conversationId}`, messageIndex, JSON.stringify(parsedMessage));
        }
      }
      const updatedMessage: string = await this.client.LINDEX(`messages:${conversationId}`, messageIndex) as string;  // instead of returining last message we're jsut returning last updated msg
      return Helpers.parseJson(updatedMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

   private async getChatUsersList(): Promise<IChatUsers[]> {
    const chatUsersList: IChatUsers[] = [];
    const chatUsers = await this.client.LRANGE('chatUsers', 0, -1);   // we are not using subkey because we want all list
    for (const item of chatUsers) {
      const chatUser: IChatUsers = Helpers.parseJson(item) as IChatUsers;
      chatUsersList.push(chatUser);
    }
    return chatUsersList;     // this will return list of all chats
  }

  // get messages from a particular converstionId
  private async getMessage(senderId: string, receiverId: string, messageId: string): Promise<IGetMessageFromCache> {
    const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
    const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
    console.log("receiver:  ", receiver);
    const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
    const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
    const message: string = find(messages, (listItem: string) => listItem.includes(messageId)) as string;
    const index: number = findIndex(messages, (listItem: string) => listItem.includes(messageId));

    return { index, message, receiver: parsedReceiver}
  }

}
