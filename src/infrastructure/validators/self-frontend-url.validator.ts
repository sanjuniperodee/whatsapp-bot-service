import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { UrlValidator } from './url.validator';

@ValidatorConstraint({ name: 'SelfFrontendUrlValidator', async: false })
export class SelfFrontendUrlValidator extends UrlValidator implements ValidatorConstraintInterface {
  validate(value?: string) {
    if (!value) {
      return true;
    }

    const urls = process.env.CORS_CLIENT_URLS?.split(',') ?? [];

    return super.validate(value) && urls.some((url) => value.trim().startsWith(url));
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be self frontend url`;
  }
}
