import { BaseRepository } from './base/BaseRepository';
import { IUser, UserModel } from '../models/User';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email }).exec();
  }
}
