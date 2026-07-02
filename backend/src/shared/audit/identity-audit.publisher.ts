import { Injectable, Logger } from '@nestjs/common';

export type IdentityAuditAction =
  | 'UserRegistered'
  | 'UserLoggedIn'
  | 'UserLoginFailed'
  | 'UserLoggedOut'
  | 'PasswordChanged'
  | 'PasswordResetRequested'
  | 'PasswordResetCompleted'
  | 'MfaEnabled'
  | 'MfaDisabled'
  | 'SessionRevoked';

export interface IdentityAuditEvent {
  action: IdentityAuditAction;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Publishes Identity domain events for the Audit Log (FR-016).
 * This is a thin seam: once a dedicated Audit Log module/entity exists,
 * this publisher should persist events there instead of logging them.
 */
@Injectable()
export class IdentityAuditPublisher {
  private readonly logger = new Logger('IdentityAudit');

  publish(event: IdentityAuditEvent): void {
    this.logger.log(JSON.stringify({ ...event, occurredAt: new Date().toISOString() }));
  }
}
