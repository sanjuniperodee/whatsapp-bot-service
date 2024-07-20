import { Model } from 'objection';

export class ObjectionEntityBase extends Model {
  id: string;
  updatedAt: Date;
  createdAt: Date;
  deletedAt?: Date;
}
