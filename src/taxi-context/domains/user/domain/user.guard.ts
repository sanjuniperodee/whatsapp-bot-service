import { urlRegexp } from '../../../../libs/utils/regexps';
import parsePhoneNumberFromString from 'libphonenumber-js';

export class UserGuard {
  static isPhoneNumber(value: string) {
    if (typeof value !== 'string') {
      throw new Error('Value of phone number must be a string');
    }

    const parsed = parsePhoneNumberFromString(value);

    if (parsed) {
      return true;
    }

    return false;
  }

  static isUrl(value: string) {
    if (typeof value !== 'string') {
      throw new Error('Value of url must be a string');
    }

    const isValid = urlRegexp.test(value);

    if (isValid) {
      return true;
    }

    return false;
  }
}
