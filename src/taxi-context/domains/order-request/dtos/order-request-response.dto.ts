import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserResponseDto } from '@domain/user/dtos/user-response.dto';

export class OrderRequestResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  props: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    driverId?: string;
    clientId: string;
    orderType: OrderType;
    orderStatus: OrderStatus;
    from: string;
    to: string;
    fromMapboxId: string;
    toMapboxId: string;
    startTime?: Date;
    arrivalTime?: Date;
    lat?: number;
    lng?: number;
    price: number;
    comment?: string;
    rating?: number;
    rejectReason?: string;
    endedAt?: Date;
  };

  @ApiProperty({ required: false })
  whatsappUser?: UserResponseDto;

  @ApiProperty({ required: false })
  driver?: UserResponseDto;

  constructor(orderRequest: any, whatsappUser?: any, driver?: any) {
    this._id = orderRequest.id?.value || orderRequest._id;
    this.props = {
      id: orderRequest.id?.value || orderRequest._id,
      createdAt: orderRequest.props?.createdAt || orderRequest.createdAt,
      updatedAt: orderRequest.props?.updatedAt || orderRequest.updatedAt,
      driverId: orderRequest.props?.driverId?.value || orderRequest.driverId,
      clientId: orderRequest.props?.clientId?.value || orderRequest.clientId,
      orderType: orderRequest.props?.orderType || orderRequest.orderType,
      orderStatus: orderRequest.props?.orderStatus || orderRequest.orderStatus,
      from: orderRequest.props?.from || orderRequest.from,
      to: orderRequest.props?.to || orderRequest.to,
      fromMapboxId: orderRequest.props?.fromMapboxId || orderRequest.fromMapboxId,
      toMapboxId: orderRequest.props?.toMapboxId || orderRequest.toMapboxId,
      startTime: orderRequest.props?.startTime || orderRequest.startTime,
      arrivalTime: orderRequest.props?.arrivalTime || orderRequest.arrivalTime,
      lat: orderRequest.props?.lat || orderRequest.lat,
      lng: orderRequest.props?.lng || orderRequest.lng,
      price: orderRequest.props?.price || orderRequest.price,
      comment: orderRequest.props?.comment || orderRequest.comment,
      rating: orderRequest.props?.rating || orderRequest.rating,
      rejectReason: orderRequest.props?.rejectReason || orderRequest.rejectReason,
      endedAt: orderRequest.props?.endedAt || orderRequest.endedAt,
    };
    this.whatsappUser = whatsappUser;
    this.driver = driver;
  }
}
