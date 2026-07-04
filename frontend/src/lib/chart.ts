// SVG line/area path builder, ported from Diseño/_template.html's `path()` helper
// (~line 1521 of the decoded Claude Design export). Used by KpiTile sparklines and
// the Dashboard/Reports revenue charts.
export function buildLinePath(values: number[], width: number, height: number, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i): [number, number] => [
    Number((i * step).toFixed(1)),
    Number((height - pad - ((v - min) / range) * (height - pad * 2)).toFixed(1)),
  ]);
  const line = 'M' + points.map((pt) => pt.join(' ')).join(' L');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area, points };
}
