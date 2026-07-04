export class CustomerNotFoundError extends Error {
  constructor() {
    super('Customer not found');
    this.name = 'CustomerNotFoundError';
  }
}

export class CustomerDuplicateTaxIdError extends Error {
  constructor() {
    super('A Customer with this taxId already exists in this Organization');
    this.name = 'CustomerDuplicateTaxIdError';
  }
}

export class CustomerMergedError extends Error {
  constructor(public readonly survivorCustomerId: string) {
    super('This Customer was discarded in a merge');
    this.name = 'CustomerMergedError';
  }
}

export class CustomerStaleUpdateError extends Error {
  constructor() {
    super('This Customer was modified since it was last read');
    this.name = 'CustomerStaleUpdateError';
  }
}

export class CustomerArchivedError extends Error {
  constructor() {
    super('This Customer is archived');
    this.name = 'CustomerArchivedError';
  }
}

export class CustomerMergeSameCustomerError extends Error {
  constructor() {
    super('A Customer cannot be merged into itself');
    this.name = 'CustomerMergeSameCustomerError';
  }
}
