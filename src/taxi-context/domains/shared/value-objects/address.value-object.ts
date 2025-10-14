import { ValueObject } from '@libs/ddd/domain/base-classes/value-object.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface AddressProps {
  from: string;
  to: string;
  intermediatePoints?: string[];
}

export class Address extends ValueObject<AddressProps> {
  get from(): string {
    return this.props.from;
  }

  get to(): string {
    return this.props.to;
  }

  get intermediatePoints(): string[] | undefined {
    return this.props.intermediatePoints;
  }

  protected validate(props: AddressProps): void {
    if (!props.from || !props.to) {
      throw new ArgumentInvalidException('Address must have a "from" and "to" location');
    }
  }
}
