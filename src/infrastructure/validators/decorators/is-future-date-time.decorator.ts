import { ValidationOptions, isISO8601, registerDecorator } from 'class-validator';

export function IsFutureDateTime(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsFutureDateTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(inputDate: any) {
          return isISO8601(inputDate, { strict: true }) && Date.parse(inputDate) > Date.now();
        },
      },
    });
  };
}
