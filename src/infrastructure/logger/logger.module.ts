import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    {
      provide: 'Logger',
      useClass: LoggerService,
    },
  ],
  exports: ['Logger'],
})
export class LoggerModule {}
