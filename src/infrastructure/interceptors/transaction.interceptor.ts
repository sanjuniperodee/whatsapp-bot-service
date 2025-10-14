import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const trxId = await this.unitOfWork.start();
    
    this.logger.debug(`Transaction started: ${trxId}`);

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.unitOfWork.commit(trxId);
          this.logger.debug(`Transaction committed: ${trxId}`);
        } catch (error) {
          this.logger.error(`Failed to commit transaction ${trxId}:`, error);
          throw error;
        }
      }),
      catchError(async (error) => {
        try {
          await this.unitOfWork.rollback(trxId);
          this.logger.debug(`Transaction rolled back: ${trxId}`);
        } catch (rollbackError) {
          this.logger.error(`Failed to rollback transaction ${trxId}:`, rollbackError);
        }
        return throwError(() => error);
      })
    );
  }
}
