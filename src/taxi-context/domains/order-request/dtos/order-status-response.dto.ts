import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserResponseDto } from '@domain/user/dtos/user-response.dto';
import { CategoryLicenseResponseDto } from '@domain/user/dtos/category-license-response.dto';

export class OrderStatusResponseDto {
  @ApiProperty()
  order: {
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
  driver?: {
    phone: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    lastSms?: string;
    deviceToken?: string;
    isBlocked: boolean;
    blockedUntil?: Date;
    blockReason?: string;
    location?: {
      latitude: number;
      longitude: number;
      timestamp: number;
    };
  };

  @ApiProperty({ required: false })
  car?: CategoryLicenseResponseDto;

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

    this.driver = driver ? {
      phone: driver.props?.phone || driver.phone,
      firstName: driver.props?.firstName || driver.firstName,
      lastName: driver.props?.lastName || driver.lastName,
      middleName: driver.props?.middleName || driver.middleName,
      lastSms: driver.props?.lastSms || driver.lastSms,
      deviceToken: driver.props?.deviceToken || driver.deviceToken,
      isBlocked: driver.props?.isBlocked || driver.isBlocked || false,
      blockedUntil: driver.props?.blockedUntil || driver.blockedUntil,
      blockReason: driver.props?.blockReason || driver.blockReason,
      location: location
    } : undefined;

    this.car = category ? new CategoryLicenseResponseDto(category) : undefined;
    this.status = orderRequest.props?.orderStatus || orderRequest.orderStatus;
    this.reviews = reviewsCount;
  }
}
