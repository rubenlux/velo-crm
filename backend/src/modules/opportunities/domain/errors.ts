export class OpportunityNotFoundError extends Error {
  constructor() {
    super('Opportunity not found');
    this.name = 'OpportunityNotFoundError';
  }
}

export class OpportunityStaleUpdateError extends Error {
  constructor() {
    super('This Opportunity was modified since it was last read');
    this.name = 'OpportunityStaleUpdateError';
  }
}

export class OpportunityArchivedError extends Error {
  constructor() {
    super('This Opportunity is Archivada — restore it before moving it in the active pipeline');
    this.name = 'OpportunityArchivedError';
  }
}

export class OpportunityNotLostError extends Error {
  constructor() {
    super('This Opportunity is not Perdida, it cannot be reopened');
    this.name = 'OpportunityNotLostError';
  }
}

export class OpportunityNotArchivedError extends Error {
  constructor() {
    super('This Opportunity is not Archivada, it cannot be restored');
    this.name = 'OpportunityNotArchivedError';
  }
}

export class RequiresEditWonPermissionError extends Error {
  constructor() {
    super('Editing a Ganada Opportunity requires the opportunity.edit_won permission');
    this.name = 'RequiresEditWonPermissionError';
  }
}

export class StageNotFoundError extends Error {
  constructor() {
    super('The target PipelineStage does not exist in this Organization, or does not belong to the same Pipeline');
    this.name = 'StageNotFoundError';
  }
}

export class StageHasOpenOpportunitiesError extends Error {
  constructor() {
    super('This PipelineStage still has open Opportunities assigned — reassign them before deleting it');
    this.name = 'StageHasOpenOpportunitiesError';
  }
}

export class PipelineNotFoundError extends Error {
  constructor() {
    super('Pipeline not found in this Organization');
    this.name = 'PipelineNotFoundError';
  }
}

export class CustomerNotFoundForOpportunityError extends Error {
  constructor() {
    super('The Customer referenced by this Opportunity does not exist in this Organization');
    this.name = 'CustomerNotFoundForOpportunityError';
  }
}
