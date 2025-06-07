import JWT from 'jsonwebtoken';
import { Request, Response } from 'express';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { loginSchema } from '@auth/schemes/signin';
import { joiValidation } from '@global/decorators/joi-validation.decorator';
import { BadRequestError } from '@global/helpers/error-handler';
import { authService } from '@service/db/auth.service';
import { config } from '@root/config';
import HTTP_STATUS from 'http-status-codes';
import { IResetPasswordParams, IUserDocument } from '@user/interfaces/user.interface';
import { userService } from '@service/db/user.service';
import { mailTransport } from '@service/emails/mail.transport';
import { emailQueue } from '@service/queues/email.queue';
import { forgotPasswordTemplate } from '@service/emails/templates/forgot-password/forgot-password-template';
import moment from 'moment';
import publicIP from 'ip';
import { resetPasswordTemplate } from '@service/emails/templates/reset-password/reset-password-template';

export class SignIn {
  @joiValidation(loginSchema)
  public async read(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;

    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(username);
    if (!existingUser) {
      throw new BadRequestError('Invalid Credentials');
    }

    const passwordMatch: boolean = await existingUser.comparePassword(password);
    if (!passwordMatch) {
      throw new BadRequestError('Invalid Credentials');
    }

    const user: IUserDocument = await userService.getUserByAuthId(`${existingUser._id}`);
    //The object we are passing this user ID is not supposed to be from existing user.
    // So the user ID needs to be the actual user that we created.
    // We need to create a new function to get the user data authId.

    console.log(1111, user);

    const userJwt: string = JWT.sign(
      {
        userId: user._id,
        uId: existingUser.uId,
        email: existingUser.email,
        username: existingUser.username,
        avatarColor: existingUser.avatarColor
      },
      config.JWT_TOKEN!
    );

    const templateParams: IResetPasswordParams = {
      username: existingUser.username!,
      email: existingUser.email!,
      ipaddress: publicIP.address(),
      date: moment().format('DD/MM/YYYY HH:mm')
    }

    // await mailTransport.sendEmail(config.SENDER_EMAIL!, 'Testing development Email', 'This is a test email to send devleopment to email box')
    // const resetLink = `${config.CLIENT_URL}/reset-password?token=256667107655`;
    // const template: string = forgotPasswordTemplate.passwordResetTemplate(existingUser.username!, resetLink);
    // const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    // emailQueue.addEmailJob('forgotPasswordEmail', {template, receiverEmail: 'marlen.wehner@ethereal.email', subject: 'Password reset confirmation'});

    req.session = { jwt: userJwt };

    const userDocument: IUserDocument = {
      ...user,
      authId: existingUser!._id,
      username: existingUser!.username,
      email: existingUser!.email,
      avatarColor: existingUser!.avatarColor,
      uId: existingUser!.uId,
      createdAt: existingUser!.createdAt
    } as IUserDocument;

    // res.status(HTTP_STATUS.OK).json({message: 'User login successfully', user: existingUser, token: userJwt});
    res.status(HTTP_STATUS.OK).json({ message: 'User login successfully', user: userDocument, token: userJwt });
  }
}
