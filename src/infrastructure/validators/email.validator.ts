import { emailRegexp } from '@libs/utils/regexps';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'EmailValidator', async: false })
export class EmailValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    return emailRegexp.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be email`;
  }
}
