import { ExceptionBase } from './exception.base';
import { ExceptionCodes } from './exception.codes';

/**
 * Used to indicate that an action is cannot be performed by some invariant reason
 *
 * @class ArgumentNotProvidedException
 * @extends {ExceptionBase}
 */
export class IllegalOperationException extends ExceptionBase {
  readonly code = ExceptionCodes.illegalOperation;
}
