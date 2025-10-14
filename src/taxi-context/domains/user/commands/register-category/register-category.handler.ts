import { Injectable, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { RegisterCategoryCommand } from './register-category.command';
import { CategoryLicenseRepository } from '../../../../domain-repositories/category-license/category-license.repository';
import { CategoryLicenseEntity } from '@domain/user/domain/entities/category-license.entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

@Injectable()
export class RegisterCategoryHandler implements ICommandHandler<RegisterCategoryCommand, void> {
  constructor(
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
  ) {}

  async execute(command: RegisterCategoryCommand): Promise<void> {
    const { driverId, governmentNumber, model, SSN, type, color, brand } = command;

    // Проверяем, не зарегистрирован ли уже водитель в этой категории
    const existingCategories = await this.categoryLicenseRepository.findMany({
      driverId,
      categoryType: type
    });

    if (existingCategories.length > 0) {
      throw new ConflictException("You already registered to this category");
    }

    // Создаем новую категорию
    const categoryLicenseEntity = CategoryLicenseEntity.create({
      SSN,
      brand,
      categoryType: type,
      color,
      driverId,
      model,
      number: governmentNumber
    });

    // Сохраняем
    await this.categoryLicenseRepository.save(categoryLicenseEntity);
  }
}
