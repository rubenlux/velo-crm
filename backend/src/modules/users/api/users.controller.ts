import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuthenticatedRequest } from '../../identity/api/auth.guard';
import { GetMyProfileUseCase } from '../application/get-my-profile.use-case';
import { UpdateProfileUseCase } from '../application/update-profile.use-case';
import { UpdatePreferencesUseCase } from '../application/update-preferences.use-case';
import { ListMyAuditLogUseCase } from '../application/list-my-audit-log.use-case';
import { ListMyOrganizationsUseCase } from '../application/list-my-organizations.use-case';
import { ListAccessHistoryUseCase } from '../application/list-access-history.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

function toProfileResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    language: user.language,
    timezone: user.timezone,
    preferences: user.preferences,
    status: user.status,
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly getMyProfileUseCase: GetMyProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly updatePreferencesUseCase: UpdatePreferencesUseCase,
    private readonly listMyAuditLogUseCase: ListMyAuditLogUseCase,
    private readonly listMyOrganizationsUseCase: ListMyOrganizationsUseCase,
    private readonly listAccessHistoryUseCase: ListAccessHistoryUseCase,
  ) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.getMyProfileUseCase.execute(req.user.id);
    return toProfileResponse(user);
  }

  @Patch('me/profile')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const user = await this.updateProfileUseCase.execute({ userId: req.user.id, updates: dto });
    return toProfileResponse(user);
  }

  @Patch('me/preferences')
  async updatePreferences(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePreferencesDto) {
    const user = await this.updatePreferencesUseCase.execute({
      userId: req.user.id,
      preferences: dto.preferences as Prisma.InputJsonValue,
    });
    return toProfileResponse(user);
  }

  @Get('me/audit-log')
  listMyAuditLog(@Req() req: AuthenticatedRequest) {
    return this.listMyAuditLogUseCase.execute(req.user.id);
  }

  @Get('me/organizations')
  listMyOrganizations(@Req() req: AuthenticatedRequest) {
    return this.listMyOrganizationsUseCase.execute(req.user.id);
  }

  @Get('me/access-history')
  async listAccessHistory(@Req() req: AuthenticatedRequest) {
    const entries = await this.listAccessHistoryUseCase.execute(req.user.id);
    return entries.map((entry) => ({
      id: entry.id,
      device: { userAgent: entry.device.userAgent, approxLocation: entry.device.approxLocation },
      status: entry.status,
      createdAt: entry.createdAt,
      lastActivityAt: entry.lastActivityAt,
    }));
  }
}
