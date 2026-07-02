import { Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../../identity/api/auth.guard';
import { AcceptInvitationUseCase } from '../application/accept-invitation.use-case';

/**
 * Lives in the organizations module (not identity/api/auth.controller.ts as originally
 * planned in tasks.md T037) to invoke AcceptInvitationUseCase directly without a
 * circular module dependency between identity and organizations — see research.md #3.
 * Still exposed at the exact path spec 004 reserved for it. AuthGuard is global (see
 * AppModule) and applies here by default since this route isn't marked @Public().
 */
@Controller('auth/invitations')
export class InvitationAcceptController {
  constructor(private readonly acceptInvitationUseCase: AcceptInvitationUseCase) {}

  @HttpCode(HttpStatus.OK)
  @Post(':token/accept')
  async accept(@Req() req: AuthenticatedRequest, @Param('token') token: string) {
    const membership = await this.acceptInvitationUseCase.execute({
      plainToken: token,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    return { organizationId: membership.organizationId, role: membership.role };
  }
}
