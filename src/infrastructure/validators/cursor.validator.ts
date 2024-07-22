import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsValidRequestCursorConstraint implements ValidatorConstraintInterface {
  async validate(validationArguments: ValidationArguments): Promise<boolean> {
    const { property } = validationArguments;
    const fields: any = validationArguments.object;

    if (property === 'afterCursor') {
      return Object.keys(fields).every((key) => {
        if (key === 'filter' || key === 'beforeCursor') {
          return !fields[key];
        }
        return true;
      });
    }

    if (property === 'beforeCursor') {
      return Object.keys(fields).every((key) => {
        if (key === 'filter' || key === 'afterCursor') {
          return !fields[key];
        }
        return true;
      });
    }
    return true;
  }

  defaultMessage() {
    return `Must be only one cursor or filter`;
  }
}

export function IsValidRequestCursor(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRequestCursorConstraint,
    });
  };
}
