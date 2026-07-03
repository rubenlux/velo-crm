export class RoleNotFoundError extends Error {
  constructor() {
    super('Role not found');
    this.name = 'RoleNotFoundError';
  }
}

export class DefaultRoleImmutableError extends Error {
  constructor() {
    super('A default Role cannot be edited or deleted');
    this.name = 'DefaultRoleImmutableError';
  }
}

export class RoleInUseError extends Error {
  constructor() {
    super('This Role has Users assigned and cannot be deleted');
    this.name = 'RoleInUseError';
  }
}

export class PrivilegeEscalationError extends Error {
  constructor() {
    super('Cannot grant a Role or Permission you do not possess yourself');
    this.name = 'PrivilegeEscalationError';
  }
}

export class InsufficientPermissionError extends Error {
  constructor(permission: string) {
    super(`Missing required permission: ${permission}`);
    this.name = 'InsufficientPermissionError';
  }
}

export class DuplicateRoleNameError extends Error {
  constructor() {
    super('A Role with this name already exists in this Organization');
    this.name = 'DuplicateRoleNameError';
  }
}

export class InvalidRoleInheritanceError extends Error {
  constructor() {
    super('inheritsFromRoleId must reference a default Role');
    this.name = 'InvalidRoleInheritanceError';
  }
}

export class UnknownPermissionError extends Error {
  constructor() {
    super('This Permission does not exist in the catalog');
    this.name = 'UnknownPermissionError';
  }
}
