import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { findPhoneNumbersInText } from 'libphonenumber-js';

@ValidatorConstraint({ name: 'PhoneValidator', async: false })
export class PhoneValidator implements ValidatorConstraintInterface {
  validate(value: string) {
    const parsed = findPhoneNumbersInText(value, 'KZ');

    if (parsed[0]?.number?.country === 'RU') {
      return false;
    }

    return !!parsed[0];
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.value} must be valid phone number`;
  }
}
