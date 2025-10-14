import { Injectable, LoggerService as NestLoggerService, Logger } from '@nestjs/common';
import { Logger as LoggerPort } from '@libs/ddd/domain/ports/logger.port';

@Injectable()
export class LoggerService implements LoggerPort, NestLoggerService {
  private readonly logger: NestLoggerService;
  private context: string;

  constructor() {
    this.logger = new Logger();
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context);
  }
}
