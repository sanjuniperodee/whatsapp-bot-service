import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '@infrastructure/enums';

export class CategoryLicenseResponseDto {
  @ApiProperty({ example: 'f1d7b3c0-5e7a-4b0e-8c1a-0f2b3d4e5f6a' })
  _id: string;

  @ApiProperty()
  props: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    driverId: string;
    categoryType: OrderType;
    SSN: string;
    brand: string;
    model: string;
    color: string;
    number: string;
  };

  constructor(categoryLicense: any) {
    this._id = categoryLicense.id?.value || categoryLicense._id;
    this.props = {
      id: categoryLicense.id?.value || categoryLicense._id,
      createdAt: categoryLicense.props?.createdAt || categoryLicense.createdAt,
      updatedAt: categoryLicense.props?.updatedAt || categoryLicense.updatedAt,
      driverId: categoryLicense.props?.driverId?.value || categoryLicense.driverId,
      categoryType: categoryLicense.props?.categoryType || categoryLicense.categoryType,
      SSN: categoryLicense.props?.SSN || categoryLicense.SSN,
      brand: categoryLicense.props?.brand || categoryLicense.brand,
      model: categoryLicense.props?.model || categoryLicense.model,
      color: categoryLicense.props?.color || categoryLicense.color,
      number: categoryLicense.props?.number || categoryLicense.number,
    };
  }
}
