import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { KpiTile } from '../../components/ui/KpiTile';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../lib/icons';
import { buildLinePath } from '../../lib/chart';
import { COLLECTION_SEGMENTS, DASH_TASKS, KPIS, LOW_STOCK, MONTHS, PIPELINE, RECENT_ACTIVITY, REVENUE, REVENUE_GOAL } from './mock-data';

export function Dashboard() {
  const session = getSession();
  const firstName = session?.user.email.split('@')[0] ?? '';
  const revPath = buildLinePath(REVENUE, 600, 200, 16);
  const goalPath = buildLinePath(REVENUE_GOAL, 600, 200, 16);

  return (
    <div className="mx-auto max-w-[1440px] px-[30px] py-[26px]">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-extrabold tracking-tight">Buenas tardes, {firstName}</h1>
          <p className="mt-1.5 text-[14px] text-text-2">
            Esto es lo que ocurre en tu Organization hoy — <span className="italic text-text-3">datos ilustrativos, pendiente el módulo de Reportes.</span>
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {KPIS.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="px-[22px] py-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-[14.5px] font-bold">Ingresos por mes</div>
                <div className="mt-1.5 flex items-baseline gap-2.5">
                  <span className="text-[26px] font-extrabold tracking-tight [font-variant-numeric:tabular-nums]">$248,900</span>
                  <span className="inline-flex items-center gap-0.5 text-[12.5px] font-bold text-green-text">
                    <Icon name="arrowU" size={13} /> 18.2%
                  </span>
                </div>
              </div>
            </div>
            <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="none" className="block">
              <defs>
                <linearGradient id="veloRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <line x1={0} y1={50} x2={600} y2={50} stroke="var(--border)" strokeDasharray="4 5" />
              <line x1={0} y1={100} x2={600} y2={100} stroke="var(--border)" strokeDasharray="4 5" />
              <line x1={0} y1={150} x2={600} y2={150} stroke="var(--border)" strokeDasharray="4 5" />
              <path d={revPath.area} fill="url(#veloRev)" />
              <path d={revPath.line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d={goalPath.line} fill="none" stroke="var(--text-3)" strokeWidth={1.6} strokeDasharray="5 5" strokeLinecap="round" />
            </svg>
            <div className="mt-2 flex justify-between">
              {MONTHS.map((m) => (
                <span key={m} className="text-[10.5px] font-semibold text-text-3">
                  {m}
                </span>
              ))}
            </div>
          </Card>

          <Card className="px-[22px] py-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[14.5px] font-bold">Pipeline de ventas</div>
              <span className="text-xs font-semibold text-text-2">$1.24M en 68 oportunidades</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {PIPELINE.map((p) => (
                <div key={p.stage} className="flex items-center gap-3.5">
                  <div className="flex w-[118px] flex-shrink-0 flex-col">
                    <span className="text-[12.5px] font-bold">{p.stage}</span>
                    <span className="text-[10.5px] font-semibold text-text-3">{p.count} deals</span>
                  </div>
                  <div className="relative h-[26px] flex-1 overflow-hidden rounded-lg bg-surface-2">
                    <div className="flex h-full items-center justify-end rounded-lg px-2" style={{ width: p.pct, background: p.color }}>
                      <span className="text-[11px] font-bold text-white">{p.amount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-[22px] py-4 text-[14.5px] font-bold">Actividad reciente</div>
            {RECENT_ACTIVITY.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-[22px] py-3.5 last:border-b-0">
                <Avatar initials={entry.avatar} tone="blue" size="sm" />
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <span className="font-bold">{entry.who}</span> <span className="text-text-2">{entry.action}</span>
                </div>
                <span className="flex-shrink-0 text-[11px] font-semibold text-text-3">{entry.time}</span>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="px-[22px] py-5">
            <div className="mb-4 text-[14.5px] font-bold">Estado de cobranza</div>
            <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
              {COLLECTION_SEGMENTS.map((seg) => (
                <div key={seg.label} style={{ width: `${seg.pct}%`, background: seg.color }} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {COLLECTION_SEGMENTS.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between text-[12px] font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                    {seg.label}
                  </span>
                  <span className="text-text-2">{seg.amount}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-[22px] py-4 text-[14.5px] font-bold">Stock bajo</div>
            {LOW_STOCK.map((item) => (
              <div key={item.sku} className="flex items-center gap-3 border-b border-border px-[22px] py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold">{item.name}</div>
                  <div className="font-mono text-[10.5px] text-text-3">{item.sku}</div>
                </div>
                <span className="text-[13px] font-extrabold" style={{ color: item.color }}>
                  {item.qty}
                </span>
              </div>
            ))}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-[22px] py-4 text-[14.5px] font-bold">Tareas de hoy</div>
            {DASH_TASKS.map((task) => (
              <div key={task.title} className="flex items-center gap-3 border-b border-border px-[22px] py-3 last:border-b-0">
                <span className="min-w-0 flex-1 text-[12.5px] font-semibold">{task.title}</span>
                <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: task.dueBg, color: task.dueColor }}>
                  {task.due}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
