import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

export function IsBiggerIfThanExist(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isBiggerThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (relatedValue != null && typeof value === 'number' && typeof relatedValue === 'number') {
            return value > relatedValue;
          }

          if (relatedValue != null && typeof value === 'string' && typeof relatedValue === 'string') {
            return Number(value) > Number(relatedValue);
          }

          return true;
        },
      },
    });
  };
}
