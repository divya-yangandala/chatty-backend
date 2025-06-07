import { Request, Response } from "express";
import HTTP_STATUS from 'http-status-codes';
import moment from "moment";
import { joiValidation } from "@global/decorators/joi-validation.decorator";
import { changePasswordSchema } from "@user/schemes/info";
import { IAuthDocument } from "@auth/interfaces/auth.interface";
import { BadRequestError } from "@global/helpers/error-handler";
import { authService } from "@service/db/auth.service";
import { userService } from "@service/db/user.service";
import { IResetPasswordParams } from "@user/interfaces/user.interface";
import publicIP from 'ip';
import { resetPasswordTemplate } from "@service/emails/templates/reset-password/reset-password-template";
import { emailQueue } from "@service/queues/email.queue";


export class Update {
  @joiValidation(changePasswordSchema)
  public async password(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(req.currentUser!.username);
    const passwordsMatch: boolean = await existingUser.comparePassword(currentPassword);
    if (!passwordsMatch) {
      throw new BadRequestError('Invalid credentials');
    }
    const hashedPassword: string = await existingUser.hashPassword(newPassword);
    // userService.updatePassword(`${existingUser!._id}`, hashedPassword); // not using await beacuse we're not returining any value
    userService.updatePassword(`${existingUser!.username}`, hashedPassword); // not using await beacuse we're not returining any value


    const templateParams: IResetPasswordParams = {
      username: existingUser.username!,
      email: existingUser.email!,
      ipaddress: publicIP.address(),
      date: moment().format('DD//MM//YYYY HH:mm')
    };
    const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    emailQueue.addEmailJob('changePassword', { template, receiverEmail: existingUser.email!, subject: 'Password update confirmation' });
    res.status(HTTP_STATUS.OK).json({
      message: 'Password updated successfully. You will be redirected shortly to the login page.'
    })
  }
}
