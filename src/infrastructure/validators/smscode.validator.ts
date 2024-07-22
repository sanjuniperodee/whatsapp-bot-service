import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'SmscodeValidator', async: false })
export class SmscodeValidator implements ValidatorConstraintInterface {
  private _length: number;

  validate(value: string) {
    this._length = Number(process.env.SMS_CODE_LENGTH ?? 4);
    return value.length === this._length;
  }

  defaultMessage() {
    return `Smscode length must be ${this._length}`;
  }
}
