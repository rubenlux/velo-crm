import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../infrastructure/user.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IdentityAuditPublisher } from '../../../shared/audit/identity-audit.publisher';
import { InvalidCredentialsError, OAuthOnlyAccountError } from '../domain/errors';

/**
 * FR-003 (profile flow): an authenticated User changes their own password,
 * proving they know the current one first.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly prisma: PrismaService,
    private readonly audit: IdentityAuditPublisher,
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    if (!user.passwordHash) {
      throw new OAuthOnlyAccountError();
    }

    const currentPasswordMatches = await this.passwordHasher.verify(user.passwordHash, currentPassword);
    if (!currentPasswordMatches) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    this.audit.publish({ action: 'PasswordChanged', userId });
  }
}
