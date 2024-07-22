import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, isISO8601 } from 'class-validator';

@ValidatorConstraint({ name: 'DateISOValidator', async: false })
export class DateISOValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    if (value == null) {
      return true;
    }

    return value != null && value.length === 10 && isISO8601(value, { strict: true });
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be date ex. YYYY-MM-DD`;
  }
}
