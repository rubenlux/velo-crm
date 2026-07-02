import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface RequestWithEmailBody {
  ip: string;
  body?: { email?: unknown };
}

/**
 * Stricter rate limit for login/register/password-reset endpoints.
 * Default per spec 004 SC-005: 5 attempts / 10 minutes per account+origin.
 * Configured via ThrottlerModule (see identity.module.ts, "auth" throttler set).
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: RequestWithEmailBody): Promise<string> {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
    return `${req.ip}:${email}`;
  }
}
