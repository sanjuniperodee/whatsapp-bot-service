import { Body, Controller, Get, Post, Put, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { DomainEventsInterceptor } from '@infrastructure/interceptors/domain-events.interceptor';
import { UseInterceptors } from '@nestjs/common';

// Commands
import { RegisterCategoryCommand } from '../commands/register-category/register-category.command';

// DTOs
import { RegisterCategoryDto } from '../commands/register-category/register-category.dto';

// Services (legacy - will be replaced with queries)
import { CategoryLicenseRepository } from '../../../domain-repositories/category-license/category-license.repository';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';

@ApiBearerAuth()
@ApiTags('Category Management')
@Controller('v1/order-requests')
@UseInterceptors(DomainEventsInterceptor)
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
  ) {}

  @Post('category/register')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Register for category' })
  @ApiBody({ type: RegisterCategoryDto })
  @ApiResponse({ status: 201, description: 'Category registered successfully' })
  @ApiResponse({ status: 409, description: 'Already registered to this category' })
  async registerCategory(@Body() dto: RegisterCategoryDto, @IAM() user: UserOrmEntity) {
    const command = new RegisterCategoryCommand(
      new UUID(user.id),
      dto.governmentNumber,
      dto.model,
      dto.SSN,
      dto.type,
      dto.color,
      dto.brand,
    );
    return this.commandBus.execute(command);
  }

  @Put('category/:id')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Edit category' })
  @ApiBody({ type: RegisterCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found or does not belong to you' })
  async editCategory(@Param('id') id: string, @Body() dto: RegisterCategoryDto, @IAM() user: UserOrmEntity) {
    // TODO: Implement UpdateCategoryCommand
    const { governmentNumber, model, SSN, type, color, brand } = dto;

    const isExists = await this.categoryLicenseRepository.findMany({
      driverId: new UUID(user.id), 
      id: new UUID(id)
    });

    if (isExists.length === 0) {
      throw new Error("Category not found or doesn't belong to you");
    }

    await CategoryLicenseOrmEntity.query().updateAndFetchById(id, {
      SSN: SSN,
      brand: brand,
      categoryType: type,
      color: color,
      model: model,
      number: governmentNumber
    });

    return { success: true };
  }

  @Get('category/info')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Info about registration by category' })
  @ApiResponse({ status: 200, description: 'Category licenses retrieved successfully' })
  async getCategoryInfo(@IAM() user: UserOrmEntity) {
    // TODO: Implement GetCategoryInfoQuery
    const categoryLicenses = await this.categoryLicenseRepository.findAllByDriverId(user.id);
    return categoryLicenses.map(categoryLicense => ({
      id: categoryLicense.id.value,
      SSN: categoryLicense.getPropsCopy().SSN,
      brand: categoryLicense.getPropsCopy().brand,
      categoryType: categoryLicense.getPropsCopy().categoryType,
      color: categoryLicense.getPropsCopy().color,
      model: categoryLicense.getPropsCopy().model,
      number: categoryLicense.getPropsCopy().number,
    }));
  }
}
