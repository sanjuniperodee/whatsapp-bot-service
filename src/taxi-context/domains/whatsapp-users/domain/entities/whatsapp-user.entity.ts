import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { UserHasEmptyFieldsError } from '../errors/whatsapp-user.errors';
import { OrderStatus } from '@infrastructure/enums';

export interface CreateWhatsappUserProps {
  phone: string;
  name: string;
  session?: string;
}

// All properties that a User has
export type WhatsappUserProps = CreateWhatsappUserProps & {

};

export class WhatsappUserEntity extends AggregateRoot<WhatsappUserProps> {
  protected readonly _id: UUID;

  static create(create: CreateWhatsappUserProps): WhatsappUserEntity {
    const id = UUID.generate();

    const props: WhatsappUserProps = {
      ...create,
    };

    return new WhatsappUserEntity({ id, props });
  }

  get id() {
    return this._id;
  }

  get phone() {
    return this.props.phone;
  }

  setSession(session: string){
    this.props.session = session;

  }

  validate(): void {
    const { name, phone } = this.props;

    const fields = [name, phone];

    if (fields.some((f) => f == null)) {
      throw new UserHasEmptyFieldsError('User must complete all required fields');
    }
  }
}
