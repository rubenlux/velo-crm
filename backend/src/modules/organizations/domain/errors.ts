export class OrganizationNotFoundError extends Error {
  constructor() {
    super('Organization not found');
    this.name = 'OrganizationNotFoundError';
  }
}

export class MembershipNotFoundError extends Error {
  constructor() {
    super('No active Membership for this User in this Organization');
    this.name = 'MembershipNotFoundError';
  }
}

export class OrganizationSuspendedError extends Error {
  constructor() {
    super('This Organization is suspended');
    this.name = 'OrganizationSuspendedError';
  }
}

export class LastOwnerError extends Error {
  constructor() {
    super('An Organization cannot be left without at least one Propietario');
    this.name = 'LastOwnerError';
  }
}

export class DuplicateDomainError extends Error {
  constructor() {
    super('This custom domain is already in use by another Organization');
    this.name = 'DuplicateDomainError';
  }
}

export class PlanLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitExceededError';
  }
}

export class InvalidOrExpiredInvitationError extends Error {
  constructor() {
    super('Invalid or expired invitation');
    this.name = 'InvalidOrExpiredInvitationError';
  }
}

export class ForbiddenRoleActionError extends Error {
  constructor(message = 'Only a Propietario can perform this action') {
    super(message);
    this.name = 'ForbiddenRoleActionError';
  }
}
