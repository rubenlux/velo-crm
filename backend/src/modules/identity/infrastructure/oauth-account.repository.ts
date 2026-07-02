import { Injectable } from '@nestjs/common';
import { OAuthProvider } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class OAuthAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProviderAccount(provider: OAuthProvider, providerAccountId: string) {
    return this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
  }

  link(userId: string, provider: OAuthProvider, providerAccountId: string) {
    return this.prisma.oAuthAccount.create({ data: { userId, provider, providerAccountId } });
  }
}
