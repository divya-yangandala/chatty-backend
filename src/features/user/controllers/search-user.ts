import { Helpers } from "@global/helpers/helpers";
import { userService } from "@service/db/user.service";
import { ISearchUser } from "@user/interfaces/user.interface";
import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';

// We are going to implement search users in mongoDB only beacuse Redis don't have any wat to doo
// And we might need to install separate tools like Redis Sarch for this
export class Search {
  public async user(req: Request, res: Response): Promise<void> {
    const regex = new RegExp(Helpers.escapeRegex(req.params.query), 'i');
    const users: ISearchUser[] = await userService.searchUsers(regex);
    res.status(HTTP_STATUS.OK).json({ message: 'Search results', search: users });
  }
}
