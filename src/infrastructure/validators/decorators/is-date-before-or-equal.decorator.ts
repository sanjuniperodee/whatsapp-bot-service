import { ValidationArguments, ValidationOptions, isISO8601, registerDecorator } from 'class-validator';

export function IsDateBeforeOrEqual(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsDateBeforeOrEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (!relatedValue) {
            return true;
          }

          return (
            isISO8601(value, { strict: true }) &&
            isISO8601(relatedValue, { strict: true }) &&
            Date.parse(value) <= Date.parse(relatedValue)
          );
        },
      },
    });
  };
}
