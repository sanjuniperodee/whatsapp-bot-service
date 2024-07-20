import { fileKeyRegexp } from '../../utils/regexps';

export class Guard {
  /**
   * Checks if value is empty. Accepts strings, numbers, booleans, objects and arrays.
   */
  static isEmpty(value: unknown): boolean {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return false;
    }
    if (typeof value === 'undefined' || value === null) {
      return true;
    }
    if (value instanceof Date) {
      return false;
    }
    if (value instanceof Object && !Object.keys(value).length) {
      return true;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return true;
      }
      if (value.every((item) => Guard.isEmpty(item))) {
        return true;
      }
    }
    if (value === '') {
      return true;
    }

    return false;
  }

  /**
   * Checks length range of a provided number/string/array
   */
  static lengthIsBetween(value: number | string | Array<unknown>, min: number, max: number): boolean {
    if (Guard.isEmpty(value)) {
      throw new Error('Cannot check length of a value. Provided value is empty');
    }
    const valueLength = typeof value === 'number' ? Number(value).toString().length : value.length;
    if (valueLength >= min && valueLength <= max) {
      return true;
    }
    return false;
  }

  static isValidEnum<T extends string>(value: T, enumType: { [key in T]: string }) {
    if (typeof value !== 'string') {
      throw new Error('Value of apartment type must be a string');
    }

    const isValid = Object.values(enumType).includes(value);

    if (isValid) {
      return true;
    }

    return false;
  }

  static isPositiveNumber(value: number) {
    if (typeof value !== 'number') {
      throw new Error('Value of cost must be a number');
    }

    const isValid = value > 0;

    if (isValid) {
      return true;
    }

    return false;
  }

  static isNegative(value: number) {
    if (typeof value !== 'number') {
      throw new Error('Value must be a number');
    }

    const isValid = value < 0;

    if (isValid) {
      return true;
    }

    return false;
  }

  static isFutureDate(value: string) {
    const date = new Date(value).getTime();
    const now = new Date().getTime();

    return now < date;
  }

  static isDateMoreThan(value: string, nextValue: string) {
    const date = new Date(value).getTime();
    const nextDate = new Date(nextValue).getTime();

    return date < nextDate;
  }

  static isFileKey(value: string) {
    if (typeof value !== 'string') {
      throw new Error('File key must be a string');
    }

    const isValid = fileKeyRegexp.test(value);

    if (isValid) {
      return true;
    }

    return false;
  }
}
