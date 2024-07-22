import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const IAM = createParamDecorator((data: keyof UserEntity, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  if (data) {
    return user?.[data];
  }

  return user;
});
