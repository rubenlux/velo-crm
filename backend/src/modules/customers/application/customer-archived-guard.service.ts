import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerArchivedError, CustomerNotFoundError } from '../domain/errors';

/**
 * Forward declaration of FR-011 ("no new Opportunities for an archived Customer
 * without explicit authorization") for spec 011 (Opportunities) to consume once it
 * exists — see data-model.md and research.md #6/#10 of spec 008. No controller in
 * this spec calls this; it has no real caller until spec 011 lands, same pattern as
 * spec 007's forward-declared CRM permission keys.
 */
@Injectable()
export class CustomerArchivedGuardService {
  constructor(private readonly customers: CustomerRepository) {}

  async assertActive(organizationId: string, customerId: string): Promise<void> {
    const customer = await this.customers.findById(organizationId, customerId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    if (customer.status === 'archived') {
      throw new CustomerArchivedError();
    }
  }
}
