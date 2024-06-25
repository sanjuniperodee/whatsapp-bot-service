import { Link } from '../entities/link.entity';

export interface LinkRepository {
  create(link: Link): Promise<void>;
  findById(id: string): Promise<Link | null>;
}
