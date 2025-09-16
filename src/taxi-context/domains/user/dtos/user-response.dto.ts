import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  props: {
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    lastSms?: string;
    deviceToken?: string;
    isBlocked: boolean;
    blockedUntil?: Date;
    blockReason?: string;
  };

  constructor(user: any) {
    this._id = user.id?.value || user._id;
    this.props = {
      phone: user.props?.phone || user.phone,
      firstName: user.props?.firstName || user.firstName,
      lastName: user.props?.lastName || user.lastName,
      middleName: user.props?.middleName || user.middleName,
      lastSms: user.props?.lastSms || user.lastSms,
      deviceToken: user.props?.deviceToken || user.deviceToken,
      isBlocked: user.props?.isBlocked || user.isBlocked || false,
      blockedUntil: user.props?.blockedUntil || user.blockedUntil,
      blockReason: user.props?.blockReason || user.blockReason,
    };
  }
}
