import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenService } from '../infrastructure/jwt.service';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

/**
 * Verifies the Bearer access token and attaches the authenticated User to the request.
 * Organization-scoped authorization (spec 005: which Organizations a User may access
 * via Membership) is enforced by a separate guard owned by the Organizations module.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly accessTokens: AccessTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing_bearer_token');
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.accessTokens.verify(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('invalid_access_token');
    }
  }
}
