// Illustrative sample data — Reporting has no backing spec yet (026). Visual-only
// page matching Diseño/_template.html's "REPORTS" screen (~line 968).
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../lib/icons';
import { buildLinePath } from '../../lib/chart';

const REVENUE_TREND = [180, 210, 195, 240, 260, 250, 280, 310, 295, 330, 350, 360];

const SALES_BY_OWNER = [
  { name: 'Diego León', value: '$412K', pct: '92%', color: 'var(--accent)' },
  { name: 'Sofía Marín', value: '$338K', pct: '75%', color: 'var(--blue)' },
  { name: 'Javier Torres', value: '$296K', pct: '66%', color: 'var(--green)' },
  { name: 'Mariana Rojas', value: '$210K', pct: '47%', color: 'var(--purple)' },
  { name: 'Lucía Paz', value: '$162K', pct: '36%', color: 'var(--amber)' },
];

const REVENUE_BY_INDUSTRY = [
  { industry: 'Tecnología', revenue: '$486K', share: '34%', change: '+12.4%', up: true },
  { industry: 'Enterprise', revenue: '$392K', share: '28%', change: '+8.1%', up: true },
  { industry: 'Retail', revenue: '$248K', share: '17%', change: '-3.2%', up: false },
  { industry: 'Servicios', revenue: '$164K', share: '12%', change: '+5.6%', up: true },
  { industry: 'Logística', revenue: '$128K', share: '9%', change: '+2.0%', up: true },
];

export function ReportsMock() {
  const path = buildLinePath(REVENUE_TREND, 600, 160, 8);

  return (
    <div className="mx-auto max-w-[1300px] px-[30px] py-6">
      <div className="mb-[22px] flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Reportes</h1>
          <p className="mt-1 text-[13px] text-text-2">Rendimiento comercial · segundo trimestre 2026</p>
        </div>
        <Button variant="secondary" icon={<Icon name="download" size={15} />}>
          Exportar PDF
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="px-[22px] py-5">
          <div className="mb-1 text-[14.5px] font-bold">Ingresos acumulados</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-extrabold tracking-tight">$1,418,000</span>
            <span className="inline-flex items-center gap-0.5 text-[12.5px] font-bold text-green-text">
              <Icon name="arrowU" size={13} /> 22.4%
            </span>
          </div>
          <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none" className="mt-4 block">
            <defs>
              <linearGradient id="veloRep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={path.area} fill="url(#veloRep)" />
            <path d={path.line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Card>

        <Card className="px-[22px] py-5">
          <div className="mb-4 text-[14.5px] font-bold">Ventas por responsable</div>
          <div className="flex flex-col gap-3.5">
            {SALES_BY_OWNER.map((b) => (
              <div key={b.name}>
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span>{b.name}</span>
                  <span className="font-bold [font-variant-numeric:tabular-nums]">{b.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-md bg-surface-2">
                  <div className="h-full rounded-md" style={{ width: b.pct, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-[14px] font-bold">Ingresos por industria</div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase text-text-3">Industria</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase text-text-3">Ingresos</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase text-text-3">Participación</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase text-text-3">Var.</th>
            </tr>
          </thead>
          <tbody>
            {REVENUE_BY_INDUSTRY.map((row) => (
              <tr key={row.industry} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3 font-bold">{row.industry}</td>
                <td className="px-5 py-3 text-right font-bold [font-variant-numeric:tabular-nums]">{row.revenue}</td>
                <td className="px-5 py-3 text-right font-semibold text-text-2">{row.share}</td>
                <td className={`px-5 py-3 text-right font-bold ${row.up ? 'text-green-text' : 'text-red-text'}`}>{row.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
