import { ValueObject } from '@libs/ddd/domain/base-classes/value-object.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface PriceProps {
  value: number;
  currency?: string;
}

export class Price extends ValueObject<PriceProps> {
  get value(): number {
    return this.props.value;
  }

  get currency(): string | undefined {
    return this.props.currency;
  }

  protected validate(props: PriceProps): void {
    if (props.value < 0) {
      throw new ArgumentInvalidException('Price cannot be negative');
    }
  }
}
