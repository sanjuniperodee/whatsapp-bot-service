import { loginRegexp } from '@libs/utils/regexps';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'LoginValidator', async: false })
export class LoginValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    return loginRegexp.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be login`;
  }
}
