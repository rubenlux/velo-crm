import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../../identity/api/auth.guard';

/**
 * Gate for platform-level administrative actions (suspend/reactivate an Organization).
 * There is no platform-admin role/entity yet — see tasks.md T046 scope note — so this
 * resolves the allowlist from PLATFORM_ADMIN_EMAILS (comma-separated) rather than
 * inventing a full admin role system out of scope for spec 005.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!allowlist.includes(request.user.email.toLowerCase())) {
      throw new ForbiddenException('platform_admin_required');
    }

    return true;
  }
}
