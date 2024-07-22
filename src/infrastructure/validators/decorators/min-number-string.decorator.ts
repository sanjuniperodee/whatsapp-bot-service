import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

export function MinNumberString(property: number, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'minNumberString',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions || { message: `min must not be less than ${property}` },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [min] = args.constraints;

          if (min != null && property != null && typeof value === 'string' && typeof min === 'number') {
            return Number(value) >= min;
          }

          return false;
        },
      },
    });
  };
}
