import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  language?: string;
  timezone?: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash?: string | null }): Promise<User> {
    return this.prisma.user.create({
      data: { email: data.email.toLowerCase(), passwordHash: data.passwordHash ?? null },
    });
  }

  markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  // Profile/lifecycle methods (spec 006-users) — see specs/006-users/research.md #1
  // for why these live on the same repository as the auth-focused methods above.

  updateProfile(userId: string, data: UpdateProfileInput): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  updatePreferences(userId: string, preferences: Prisma.InputJsonValue): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: { preferences } });
  }

  updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status, deletedAt: status === 'Deleted' ? new Date() : undefined },
    });
  }

  async findStatusById(userId: string): Promise<UserStatus | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    return user?.status ?? null;
  }
}
