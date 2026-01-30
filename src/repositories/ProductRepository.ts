import { BaseRepository } from './base/BaseRepository';
import { IProduct, ProductModel } from '../models/Product';

export class ProductRepository extends BaseRepository<IProduct> {
  constructor() {
    super(ProductModel);
  }

  async findByName(name: string): Promise<IProduct | null> {
    return this.model.findOne({ name }).exec();
  }
}
