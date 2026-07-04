import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerMergedError, CustomerNotFoundError } from '../domain/errors';

@Injectable()
export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(organizationId: string, customerId: string): Promise<Customer> {
    const customer = await this.customers.findById(organizationId, customerId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    if (customer.mergedIntoCustomerId) {
      throw new CustomerMergedError(customer.mergedIntoCustomerId);
    }
    return customer;
  }
}
