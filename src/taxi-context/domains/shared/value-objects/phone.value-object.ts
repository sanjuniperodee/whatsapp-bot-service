import { ValueObject } from '@libs/ddd/domain/base-classes/value-object.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface PhoneProps {
  value: string;
}

export class Phone extends ValueObject<PhoneProps> {
  get value(): string {
    return this.props.value;
  }

  protected validate(props: PhoneProps): void {
    if (!/^(\+?\d{1,3}[- ]?)?\d{10}$/.test(props.value)) {
      throw new ArgumentInvalidException('Invalid phone number format');
    }
  }
}
