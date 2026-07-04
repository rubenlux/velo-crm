import { Icon, IconName } from '../../lib/icons';
import { buildLinePath } from '../../lib/chart';
import { Card } from './Card';

export interface KpiTileProps {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  spark?: number[];
}

export function KpiTile({ icon, iconColor, label, value, delta, up, spark }: KpiTileProps) {
  const path = spark && spark.length > 1 ? buildLinePath(spark, 60, 22, 3) : null;
  const strokeColor = up ? 'var(--green)' : 'var(--red)';
  const fillColor = up ? 'var(--green-soft)' : 'var(--red-soft)';

  return (
    <Card className="flex flex-col gap-3.5 px-[22px] py-5 transition-shadow hover:shadow hover:border-border-strong">
      <div className="flex items-center gap-2 text-text-2">
        <span style={{ color: iconColor }} className="flex">
          <Icon name={icon} size={15} />
        </span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="text-[27px] font-extrabold leading-none tracking-tight [font-variant-numeric:tabular-nums]">{value}</div>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold ${up ? 'text-green-text' : 'text-red-text'}`}>
          <Icon name={up ? 'arrowU' : 'arrowD'} size={12} />
          {delta}
        </span>
        {path && (
          <svg width={60} height={22} viewBox="0 0 60 22" fill="none" preserveAspectRatio="none">
            <path d={path.area} fill={fillColor} />
            <path d={path.line} stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
    </Card>
  );
}
