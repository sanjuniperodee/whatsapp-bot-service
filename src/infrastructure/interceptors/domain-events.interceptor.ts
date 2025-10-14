import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DomainEvents } from '@libs/ddd/domain/domain-events/domain-events';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class DomainEventsInterceptor implements NestInterceptor {
  constructor(
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (result) => {
        // Проверяем, что результат содержит aggregate с событиями
        if (result && typeof result === 'object' && 'id' in result) {
          try {
            // Публикуем события для aggregate
            await DomainEvents.publishEvents(result.id, this.logger);
            this.logger.debug(`Domain events published for aggregate ${result.id.value}`);
          } catch (error) {
            this.logger.error(`Failed to publish domain events for aggregate ${result.id.value}:`, error);
          }
        }
      })
    );
  }
}
