import { ArgumentInvalidException } from '../../../exceptions';
import { v4 as uuidV4, validate } from 'uuid';

// import { ArgumentInvalidException } from '../../../exceptions/argument-invalid.exception';
import { DomainPrimitive } from '../base-classes/value-object.base';
import { ID } from './id.value-object';

export class UUID extends ID {
  /**
   *Returns new ID instance with randomly generated ID value
   * @static
   * @return {*}  {ID}
   * @memberof ID
   */
  static generate(): UUID {
    return new UUID(uuidV4());
  }

  protected validate({ value }: DomainPrimitive<string>): void {
    if (!validate(value)) {
      throw new ArgumentInvalidException('Incorrect UUID format');
    }
  }
}
