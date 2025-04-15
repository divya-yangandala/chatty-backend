import { JoiRequestValidatorError } from '@global/helpers/error-handler';
import { Request } from 'express';
import { ObjectSchema } from 'joi';

//define a type

type IJoiDecorator = (target: any, key: string, descriptor: PropertyDescriptor) => void;

// we'll pass the object schema
export function joiValidation(schema: ObjectSchema): IJoiDecorator {
  return (_target: any, _key: string, descriptor: PropertyDescriptor) => {
    // we need to get the values
    const originalMethod = descriptor.value;

    //inside this async function we are going to perform the actual validation and use the joi
    //We are passing all the properties from the method where this validation will be called we are passing them inside here.
    descriptor.value = async function (...args: any[]) {
      const req: Request = args[0];
      // joi gived two options 1)validateAsync method[try-catch is must] or validate method

      const { error } = await Promise.resolve(schema.validate(req.body));
      if (error?.details) {
        throw new JoiRequestValidatorError(error.details[0].message);
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

// our function will be like---
// function signup(req, res, next)
