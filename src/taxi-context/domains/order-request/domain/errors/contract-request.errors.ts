import { ExceptionBase } from '@libs/exceptions';

export class ContractRequestHasEmptyFieldsError extends ExceptionBase {
  static readonly message = 'Contract request entity has empty fields';

  public readonly code = 'CONTRACT_REQUEST.HAS_EMPTY_FIELDS';

  constructor(metadata?: unknown) {
    super(ContractRequestHasEmptyFieldsError.message, metadata);
  }
}

export class ContractRequestHasNullRequiredFieldsError extends ExceptionBase {
  static message = 'Contract request has null required fields';

  public readonly code = 'CONTRACT_REQUEST.HAS_NULL_REQUIRED_FIELDS';

  constructor(metadata?: unknown) {
    super(ContractRequestHasNullRequiredFieldsError.message, metadata);
  }
}
