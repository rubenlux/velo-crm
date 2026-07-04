export class ContactNotFoundError extends Error {
  constructor() {
    super('Contact not found');
    this.name = 'ContactNotFoundError';
  }
}

export class CustomerNotFoundForContactError extends Error {
  constructor() {
    super('The Customer referenced by this Contact does not exist in this Organization');
    this.name = 'CustomerNotFoundForContactError';
  }
}

export class ContactMergedError extends Error {
  constructor(public readonly survivorContactId: string) {
    super('This Contact was discarded in a merge');
    this.name = 'ContactMergedError';
  }
}

export class ContactStaleUpdateError extends Error {
  constructor() {
    super('This Contact was modified since it was last read');
    this.name = 'ContactStaleUpdateError';
  }
}

export class ContactCustomerMismatchError extends Error {
  constructor() {
    super('Both Contacts must belong to the same Customer to be merged');
    this.name = 'ContactCustomerMismatchError';
  }
}

export class ContactMergeSameContactError extends Error {
  constructor() {
    super('A Contact cannot be merged into itself');
    this.name = 'ContactMergeSameContactError';
  }
}
