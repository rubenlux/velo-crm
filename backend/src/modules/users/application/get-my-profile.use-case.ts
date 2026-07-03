import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserRepository } from '../../identity/infrastructure/user.repository';
import { UserNotFoundError } from '../domain/errors';

@Injectable()
export class GetMyProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
