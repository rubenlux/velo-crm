// Illustrative sample data ported from Diseño/_template.html (~lines 1666-1700 of the
// decoded Claude Design export). Opportunities/Leads have no backing spec yet (010/011)
// — this screen is visual-only, no API calls.

export interface Deal {
  id: string;
  company: string;
  amount: string;
  ownerInitials: string;
  ownerColor: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  stage: string;
}

export interface KanbanColumn {
  title: string;
  count: number;
  sum: string;
  dot: string;
  deals: Deal[];
}

let dealId = 0;
function deal(company: string, amount: string, ownerInitials: string, ownerColor: string, tag: string, tagBg: string, tagFg: string, stage: string): Deal {
  dealId += 1;
  return { id: `deal-${dealId}`, company, amount, ownerInitials, ownerColor, tag, tagBg, tagFg, stage };
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    title: 'Prospecto',
    count: 6,
    sum: '$420K',
    dot: 'var(--blue)',
    deals: [
      deal('Café Modena', '$68,000', 'SM', 'var(--purple)', 'Retail', 'var(--blue-soft)', 'var(--blue)', 'Prospecto'),
      deal('Vértice Diseño', '$42,000', 'MR', 'var(--accent)', 'Servicios', 'var(--purple-soft)', 'var(--purple)', 'Prospecto'),
      deal('Lumen Estudio', '$31,500', 'DL', 'var(--blue)', 'Media', 'var(--surface-3)', 'var(--text-2)', 'Prospecto'),
    ],
  },
  {
    title: 'Contactado',
    count: 5,
    sum: '$318K',
    dot: 'var(--purple)',
    deals: [
      deal('Grupo Halcón', '$84,000', 'DL', 'var(--blue)', 'Enterprise', 'var(--accent-soft)', 'var(--accent-text)', 'Contactado'),
      deal('Nordika Studios', '$56,000', 'JT', 'var(--green-text)', 'Tech', 'var(--green-soft)', 'var(--green-text)', 'Contactado'),
    ],
  },
  {
    title: 'Propuesta',
    count: 4,
    sum: '$262K',
    dot: 'var(--accent)',
    deals: [
      deal('Terra Logística', '$120,000', 'LP', '#E0A63C', 'Enterprise', 'var(--accent-soft)', 'var(--accent-text)', 'Propuesta'),
      deal('Bloom Cosmética', '$38,000', 'SM', 'var(--purple)', 'Retail', 'var(--blue-soft)', 'var(--blue)', 'Propuesta'),
    ],
  },
  {
    title: 'Negociación',
    count: 3,
    sum: '$164K',
    dot: 'var(--amber)',
    deals: [
      deal('Halcón · Renovación', '$96,000', 'DL', 'var(--blue)', 'Enterprise', 'var(--accent-soft)', 'var(--accent-text)', 'Negociación'),
      deal('Pixel Foundry', '$28,000', 'MR', 'var(--accent)', 'Tech', 'var(--green-soft)', 'var(--green-text)', 'Negociación'),
    ],
  },
  {
    title: 'Ganado',
    count: 2,
    sum: '$78K',
    dot: 'var(--green)',
    deals: [deal('Nordika · Anual', '$60,000', 'JT', 'var(--green-text)', 'Tech', 'var(--green-soft)', 'var(--green-text)', 'Ganado')],
  },
];

export const ALL_DEALS: Deal[] = KANBAN_COLUMNS.flatMap((col) => col.deals);
