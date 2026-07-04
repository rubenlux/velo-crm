import { Customer } from '@prisma/client';

// Minimal RFC4180-style CSV (quote every field, double up embedded quotes) — no
// external dependency for a format this small and fully controlled by this module
// (research.md #7: import must accept exactly what export produces).
const COLUMNS = [
  'name',
  'legalName',
  'tradeName',
  'type',
  'taxId',
  'taxCondition',
  'email',
  'phone',
  'website',
  'country',
  'state',
  'city',
  'address',
  'ownerUserId',
  'source',
  'category',
  'tags',
  'priority',
] as const;

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function customersToCsv(customers: Customer[]): string {
  const header = COLUMNS.map(quote).join(',');
  const rows = customers.map((customer) =>
    COLUMNS.map((column) => {
      const value = column === 'tags' ? customer.tags.join(';') : ((customer as unknown as Record<string, unknown>)[column] ?? '');
      return quote(String(value));
    }).join(','),
  );
  return [header, ...rows].join('\n');
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export interface ParsedCustomerRow {
  row: number;
  name?: string;
  legalName?: string;
  tradeName?: string;
  type?: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  ownerUserId?: string;
  source?: string;
  category?: string;
  tags?: string[];
  priority?: string;
}

export function parseCustomersCsv(content: string): ParsedCustomerRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const header = parseLine(lines[0]);
  return lines.slice(1).map((line, index) => {
    const fields = parseLine(line);
    const record: Record<string, string> = {};
    header.forEach((column, columnIndex) => {
      record[column] = fields[columnIndex] ?? '';
    });
    return {
      row: index + 2, // +1 for 1-indexing, +1 for the header row
      name: record.name || undefined,
      legalName: record.legalName || undefined,
      tradeName: record.tradeName || undefined,
      type: record.type || undefined,
      taxId: record.taxId || undefined,
      taxCondition: record.taxCondition || undefined,
      email: record.email || undefined,
      phone: record.phone || undefined,
      website: record.website || undefined,
      country: record.country || undefined,
      state: record.state || undefined,
      city: record.city || undefined,
      address: record.address || undefined,
      ownerUserId: record.ownerUserId || undefined,
      source: record.source || undefined,
      category: record.category || undefined,
      tags: record.tags ? record.tags.split(';').filter(Boolean) : undefined,
      priority: record.priority || undefined,
    };
  });
}
