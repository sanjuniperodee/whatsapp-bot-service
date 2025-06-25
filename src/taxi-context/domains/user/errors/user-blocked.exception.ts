import { HttpException, HttpStatus } from '@nestjs/common';

export class UserBlockedException extends HttpException {
  constructor(
    public readonly reason: string,
    public readonly blockedUntil?: Date,
  ) {
    super(
      {
        message: 'Ваш аккаунт заблокирован. Создание заказов недоступно.',
        reason: reason,
        blockedUntil: blockedUntil?.toISOString(),
      },
      HttpStatus.FORBIDDEN,
    );
  }
} 