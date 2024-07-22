import { urlRegexp } from '@libs/utils/regexps';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'UrlValidator', async: false })
export class UrlValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    return typeof value === 'string' ? urlRegexp.test(value) : true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be url`;
  }
}
