import { BaseRepository } from './base/BaseRepository';
import { IProduct, ProductModel } from '../models/Product';

export class ProductRepository extends BaseRepository<IProduct> {
  constructor() {
    super(ProductModel);
  }

  // Custom methods if needed, e.g., checkStock
}
