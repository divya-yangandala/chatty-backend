import { Request, Response } from "express";
import { SignUp } from "@auth/controllers/signup";
import { CustomError } from "@global/helpers/error-handler";
import { authMock, authMockRequest, authMockResponse } from "@root/mocks/auth.mock";
import * as cloudinaryUploads from "@global/helpers/cloudinary-upload";
import { authService } from "@service/db/auth.service";
import { UserCache } from "@service/redis/user.cache";
import { AnyExpression } from "mongoose";

// We need to mock all the cache, queue and cloudinary uploads

jest.mock('@service/queues/base.queue');
jest.mock('@service/queues/auth.queue');
jest.mock('@service/queues/auth.queue');
jest.mock('@service/queues/user.queue');
jest.mock('@global/helpers/cloudinary-upload');

describe('SignUp', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should throw an error if username is not available', () => {
    const req: Request = authMockRequest({}, {
      username: '',
      email: 'manny@test.com',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: ''
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Username is a required field');
    });
  });


  it('should throw an error if username is less than a minimum length', () => {
    const req: Request = authMockRequest({}, {
      username: 'ma',
      email: 'manny@test.com',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: ''
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Invalid username');
    });
  });

  it('should throw an error if username length is greater than maximum length', () => {
    const req: Request = authMockRequest({}, {
      username: 'tyutytyuuywyyuiquuuiouiuiuihhshhkhkshhk',
      email: 'manny@test.com',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: 'qwertyuiop'
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Invalid username');
    });
  });


  it('should throw an error if username is not available', () => {
    const req: Request = authMockRequest({}, {
      username: '',
      email: 'manny@test.com',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: 'qwertyuiop'
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Username is a required field');
    });
  });


  it('should throw an error if email is not valid', () => {
    const req: Request = authMockRequest({}, {
      username: 'manny',
      email: 'invalid email',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: 'qwertyuiop'
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Email must be valid');
    });
  });


  it('should throw an error if email is not available', () => {
    const req: Request = authMockRequest({}, {
      username: 'Manny',
      email: '',
      password: 'qwerty',
      avatarColor: 'red',
      avatarImage: 'qwertyuiop'
    }) as Request;
    const res: Response = authMockResponse();

    SignUp.prototype.create(req, res).catch((error: CustomError) => {
      // console.log(error);
      expect(error.statusCode).toEqual(400);
      expect(error.serializeErrors().message).toEqual('Email is a required field');
    });
  });


  it('should throw an unauthorize error if user already exists', () => {
    const req: Request = authMockRequest(
      {},
      {
        username: 'Manny',
        email: 'manny@test.com',
        password: 'qwerty',
        avatarColor: 'red',
        avatarImage: 'qwertyuiop'
      }) as Request;
      const res: Response = authMockResponse();
      jest.spyOn(authService, 'getUserByUsernameOrEmail').mockResolvedValue(authMock);
      SignUp.prototype.create(req, res).catch((error: CustomError) => {
        expect(error.statusCode).toEqual(400);
        expect(error.serializeErrors().message).toEqual('Invalid Credentials');
      });
  })



  it('should set a session for valid credentials and send correct json response', async() => {
    const req: Request = authMockRequest(
      {},
      {
        username: 'Manny',
        email: 'manny@test.com',
        password: 'qwerty',
        avatarColor: 'red',
        avatarImage: 'qwertyuiop'
      }) as Request;
      const res: Response = authMockResponse();

      const userSpy = jest.spyOn(UserCache.prototype, 'saveUserToCache');
      jest.spyOn(authService, 'getUserByUsernameOrEmail').mockResolvedValue(null as any);

      //here for cloudinary we are not jsut mocking value but the implementation
      jest.spyOn(cloudinaryUploads, 'uploads').mockImplementation((): any => Promise.resolve({ version: '1234567890', public_id: '123456'}));
      await SignUp.prototype.create(req, res);
      // console.log(req.session);
      // console.log(res.json);
      console.log(userSpy.mock);

      //we are excpectiong the session must return jwt token
      expect(req.session?.jwt).toBeDefined();
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        user: userSpy.mock.calls[0][2],
        token: req.session?.jwt
      })

  })

});
