export class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

export class LastAdminError extends Error {
  constructor() {
    super('This Organization cannot be left without at least one active administrator');
    this.name = 'LastAdminError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message = 'This status transition is not allowed') {
    super(message);
    this.name = 'InvalidStatusTransitionError';
  }
}

export class ForbiddenRoleActionError extends Error {
  constructor(message = 'Only a Propietario or Administrador can perform this action') {
    super(message);
    this.name = 'ForbiddenRoleActionError';
  }
}
