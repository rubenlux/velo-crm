export class ActivityNotFoundError extends Error {
  constructor() {
    super('Activity not found');
    this.name = 'ActivityNotFoundError';
  }
}

export class ActivityStaleUpdateError extends Error {
  constructor() {
    super('This Activity was modified since it was last read');
    this.name = 'ActivityStaleUpdateError';
  }
}

export class ActivityNotCancelledError extends Error {
  constructor() {
    super('This Activity is not Cancelada, it cannot be reactivated');
    this.name = 'ActivityNotCancelledError';
  }
}

export class ActivityNotFinishedError extends Error {
  constructor() {
    super('The result can only be recorded on a Finalizada Activity');
    this.name = 'ActivityNotFinishedError';
  }
}

export class ActivityRelatedEntitiesMismatchError extends Error {
  constructor() {
    super('The related entities provided for this Activity do not resolve to the same Customer');
    this.name = 'ActivityRelatedEntitiesMismatchError';
  }
}

export class ActivityNoRelationError extends Error {
  constructor() {
    super('An Activity must be associated with at least one Customer, Contact, Lead or Opportunity');
    this.name = 'ActivityNoRelationError';
  }
}

export class ActivityTypeNotFoundError extends Error {
  constructor() {
    super('ActivityType not found in this Organization');
    this.name = 'ActivityTypeNotFoundError';
  }
}

export class ActivityRelatedEntityNotFoundError extends Error {
  constructor() {
    super('A Customer, Contact, Lead or Opportunity referenced by this Activity does not exist in this Organization');
    this.name = 'ActivityRelatedEntityNotFoundError';
  }
}

export class CommentNotFoundError extends Error {
  constructor() {
    super('Comment not found on this Activity');
    this.name = 'CommentNotFoundError';
  }
}

export class CommentNotOwnedError extends Error {
  constructor() {
    super('Only the author of this comment can edit or delete it');
    this.name = 'CommentNotOwnedError';
  }
}
