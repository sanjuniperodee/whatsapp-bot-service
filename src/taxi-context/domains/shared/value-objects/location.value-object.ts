import { ValueObject } from '@libs/ddd/domain/base-classes/value-object.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface LocationProps {
  latitude: number;
  longitude: number;
}

export class Location extends ValueObject<LocationProps> {
  get latitude(): number {
    return this.props.latitude;
  }

  get longitude(): number {
    return this.props.longitude;
  }

  protected validate(props: LocationProps): void {
    if (props.latitude < -90 || props.latitude > 90) {
      throw new ArgumentInvalidException('Invalid latitude');
    }
    if (props.longitude < -180 || props.longitude > 180) {
      throw new ArgumentInvalidException('Invalid longitude');
    }
  }
}
