import { ExceptionBase } from '@libs/exceptions';

export class UserHasEmptyFieldsError extends ExceptionBase {
  static readonly message = 'User entity has empty fields';

  public readonly code = 'USER.HAS_EMPTY_FIELDS';

  constructor(metadata?: unknown) {
    super(UserHasEmptyFieldsError.message, metadata);
  }
}
