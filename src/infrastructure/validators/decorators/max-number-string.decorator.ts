import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

export function MaxNumberString(property: number, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'maxNumberString',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions || { message: `max must not be greater than ${property}` },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [max] = args.constraints;

          if (max != null && property != null && typeof value === 'string' && typeof max === 'number') {
            return Number(value) <= max;
          }

          return false;
        },
      },
    });
  };
}
