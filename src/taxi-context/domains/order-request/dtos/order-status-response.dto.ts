import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserResponseDto } from '@domain/user/dtos/user-response.dto';

export class OrderStatusResponseDto {
  @ApiProperty()
  order: {
    id: { props: { value: string } };
    createdAt: Date;
    updatedAt: Date;
    driverId?: { props: { value: string } };
    clientId: { props: { value: string } };
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
  driver?: UserResponseDto;

  @ApiProperty({ required: false })
  car?: { id: string; props: { SSN?: string; brand?: string; model?: string; color?: string; number?: string } };

  @ApiProperty()
  status: OrderStatus;

  @ApiProperty()
  reviews: number;

  constructor(
    orderRequest: any,
    driver?: any,
    category?: any,
    location?: any,
    reviewsCount: number = 0
  ) {
    this.order = {
      id: { props: { value: orderRequest.id?.value || orderRequest._id } },
      createdAt: orderRequest.props?.createdAt || orderRequest.createdAt,
      updatedAt: orderRequest.props?.updatedAt || orderRequest.updatedAt,
      driverId: orderRequest.props?.driverId?.value || orderRequest.driverId
        ? { props: { value: orderRequest.props?.driverId?.value || orderRequest.driverId } }
        : undefined,
      clientId: { props: { value: orderRequest.props?.clientId?.value || orderRequest.clientId } },
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

    this.driver = driver ? new UserResponseDto(driver) : undefined;

    this.car = category
      ? {
          id: category.id?.value || category._id,
          props: {
            SSN: category.props?.SSN || category.SSN,
            brand: category.props?.brand || category.brand,
            model: category.props?.model || category.model,
            color: category.props?.color || category.color,
            number: category.props?.number || category.number,
          },
        }
      : undefined;
    this.status = orderRequest.props?.orderStatus || orderRequest.orderStatus;
    this.reviews = reviewsCount;
  }
}
