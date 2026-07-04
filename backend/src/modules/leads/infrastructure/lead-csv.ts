// Minimal RFC4180-style CSV parser — no external dependency, same approach as
// customers/infrastructure/customer-csv.ts (spec 008 research.md #7). Import-only:
// FR-002 only asks for batch import, not export, for Leads.

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

export interface ParsedLeadRow {
  row: number;
  name?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  source?: string;
  campaign?: string;
  interest?: string;
  ownerUserId?: string;
  tags?: string[];
  priority?: string;
}

export function parseLeadsCsv(content: string): ParsedLeadRow[] {
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
      company: record.company || undefined,
      jobTitle: record.jobTitle || undefined,
      email: record.email || undefined,
      phone: record.phone || undefined,
      whatsapp: record.whatsapp || undefined,
      country: record.country || undefined,
      state: record.state || undefined,
      city: record.city || undefined,
      address: record.address || undefined,
      source: record.source || undefined,
      campaign: record.campaign || undefined,
      interest: record.interest || undefined,
      ownerUserId: record.ownerUserId || undefined,
      tags: record.tags ? record.tags.split(';').filter(Boolean) : undefined,
      priority: record.priority || undefined,
    };
  });
}
