import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { CustomerRepository, CustomerSearchFilters } from '../infrastructure/customer.repository';

export interface SearchCustomersResult {
  items: Customer[];
  total: number;
}

@Injectable()
export class SearchCustomersUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  execute(organizationId: string, filters: CustomerSearchFilters): Promise<SearchCustomersResult> {
    return this.customers.search(organizationId, filters);
  }
}
