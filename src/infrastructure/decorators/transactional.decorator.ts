import { SetMetadata } from '@nestjs/common';

export const TRANSACTIONAL_KEY = 'transactional';

/**
 * Decorator to mark methods that should run within a transaction
 */
export const Transactional = () => SetMetadata(TRANSACTIONAL_KEY, true);
