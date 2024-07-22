import { ValidationArguments, ValidationOptions, isISO8601, registerDecorator } from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(inputDate: any) {
          if (inputDate == null) {
            return true;
          }

          const currentDate = Date.parse(new Date().toISOString().slice(0, 10));

          return isISO8601(inputDate, { strict: true }) && Date.parse(inputDate) >= currentDate;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.value} must be future date`;
        },
      },
    });
  };
}
