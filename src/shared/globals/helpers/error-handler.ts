// Our custom error will extend the JS error class

import HTTP_STATUS from 'http-status-codes';

export interface IErrorResponse {
  message: string;
  statusCode: number;
  status: string;
  serializeErrors(): IError;
}

export interface IError {
  message: string;
  statusCode: number;
  status: string;
}

// Anabstract class is basically defined to be a Base class

export abstract class CustomError extends Error {
  abstract statusCode: number; // whoever will use this export class has to defined these 2 abstract properties
  abstract status: string;

  constructor(message: string) {
    // this is a custom message going to pass
    super(message);
  }

  serializeErrors(): IError {
    return {
      message: this.message, // this is custom msg but status and statusCode are coming from Error class
      status: this.status,
      statusCode: this.statusCode
    };
  }
}

// defining error classes

export class JoiRequestValidatorError extends CustomError {
  statusCode = HTTP_STATUS.BAD_REQUEST;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}

export class BadRequestError extends CustomError {
  statusCode = HTTP_STATUS.BAD_REQUEST;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}

// If we want to use this BadRequestError write as below
// throw new BadRequestError("You have an error");

export class NotFoundError extends CustomError {
  statusCode = HTTP_STATUS.NOT_FOUND;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}

export class NotAuthorizedError extends CustomError {
  statusCode = HTTP_STATUS.UNAUTHORIZED;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}

export class FileTooLargeError extends CustomError {
  statusCode = HTTP_STATUS.REQUEST_TOO_LONG;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}

export class ServerError extends CustomError {
  statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
  status = 'error';

  constructor(message: string) {
    super(message);
  }
}
