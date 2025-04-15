import { SignIn } from '@auth/controllers/signin';
import { SignOut } from '@auth/controllers/signout';
import { SignUp } from '@auth/controllers/signup';
import express, { Router } from 'express';

class AuthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router(); // initializing the private variable inside the contructor
  }

  public routes(): Router {
    this.router.post('/signup', SignUp.prototype.create);
    this.router.post('/signin', SignIn.prototype.read);
    return this.router;
  }

  //Now, the reason why I'm doing this is because it's simply because that's for a user to sign out.
  // They have to be signed in first. So it requires some form of authentication before they can sign out.
  // So that is why I need to set this as a separate root method.But the user doesn't need to log in in order for them to call the sign up API or the sign in API.
  // But for the sign outs, the user needs to be logged in before they can log out.

  public signOutRoutes(): Router {
    this.router.get('/signout', SignOut.prototype.update);
    return this.router;
  }
}

export const authRoutes: AuthRoutes = new AuthRoutes();
