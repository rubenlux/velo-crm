export class LeadNotFoundError extends Error {
  constructor() {
    super('Lead not found');
    this.name = 'LeadNotFoundError';
  }
}

export class LeadStaleUpdateError extends Error {
  constructor() {
    super('This Lead was modified since it was last read');
    this.name = 'LeadStaleUpdateError';
  }
}

export class LeadAlreadyConvertedError extends Error {
  constructor() {
    super('This Lead was already converted');
    this.name = 'LeadAlreadyConvertedError';
  }
}

export class LeadNotConvertibleError extends Error {
  constructor() {
    super('This Lead is not in a convertible state (Perdido/Archivado must be reactivated first)');
    this.name = 'LeadNotConvertibleError';
  }
}

export class LeadNotLostError extends Error {
  constructor() {
    super('This Lead is not Perdido, it cannot be reactivated');
    this.name = 'LeadNotLostError';
  }
}

export class LeadConversionLinkNotFoundError extends Error {
  constructor() {
    super('The Customer or Contact to link does not exist in this Organization');
    this.name = 'LeadConversionLinkNotFoundError';
  }
}

export class LeadDuplicateWarning extends Error {
  constructor(
    public readonly candidateCustomerId?: string,
    public readonly candidateContactId?: string,
  ) {
    super('A Customer or Contact with this email/phone already exists in this Organization');
    this.name = 'LeadDuplicateWarning';
  }
}
