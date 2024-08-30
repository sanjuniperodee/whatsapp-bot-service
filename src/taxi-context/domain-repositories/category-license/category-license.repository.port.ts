import { RepositoryPort } from '@libs/ddd/domain/ports/repository.ports';
import { CategoryLicenseEntity, CategoryLicenseProps } from '@domain/user/domain/entities/category-license.entity';

export interface CategoryLicenseRepositoryPort extends RepositoryPort<CategoryLicenseEntity, CategoryLicenseProps> {

}
