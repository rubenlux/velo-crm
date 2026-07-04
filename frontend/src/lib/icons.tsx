// Icon set ported from Diseño/_template.html's `ic()` factory (~line 1452 of the
// decoded Claude Design export). Same path data, same 24x24 viewBox/stroke style.

type PathSpec = { tag: 'path'; d: string } | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number } | { tag: 'circle'; cx: number; cy: number; r: number } | { tag: 'line'; x1: number; y1: number; x2: number; y2: number };

function p(d: string): PathSpec {
  return { tag: 'path', d };
}
function rect(x: number, y: number, width: number, height: number, rx?: number): PathSpec {
  return { tag: 'rect', x, y, width, height, rx };
}
function circle(cx: number, cy: number, r: number): PathSpec {
  return { tag: 'circle', cx, cy, r };
}
function line(x1: number, y1: number, x2: number, y2: number): PathSpec {
  return { tag: 'line', x1, y1, x2, y2 };
}

const ICONS: Record<string, PathSpec[]> = {
  dashboard: [rect(3, 3, 8, 9, 1.5), rect(13, 3, 8, 5, 1.5), rect(13, 12, 8, 9, 1.5), rect(3, 16, 8, 5, 1.5)],
  users: [p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), circle(9, 7, 4), p('M22 21v-2a4 4 0 0 0-3-3.9'), p('M16 3.1a4 4 0 0 1 0 7.8')],
  contact: [rect(3, 4, 18, 16, 2), circle(9, 10, 2), p('M15 8h4'), p('M15 12h3'), p('M6.5 17a3 3 0 0 1 5 0')],
  target: [circle(12, 12, 9), circle(12, 12, 5), circle(12, 12, 1)],
  trending: [p('M3 17l6-6 4 4 8-8'), p('M17 7h4v4')],
  calendar: [rect(3, 4, 18, 18, 2), p('M3 10h18'), p('M8 2v4'), p('M16 2v4')],
  activity: [p('M22 12h-4l-3 9L9 3l-3 9H2')],
  check: [p('M9 11l3 3L22 4'), p('M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11')],
  file: [p('M14 3v4a1 1 0 0 0 1 1h4'), p('M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z'), p('M9 13h6'), p('M9 17h4')],
  receipt: [p('M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z'), p('M8 7h8'), p('M8 11h6')],
  card: [rect(2, 5, 20, 14, 2), p('M2 10h20')],
  pkg: [
    p('M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'),
    p('m3.3 7 8.7 5 8.7-5'),
    p('M12 22V12'),
  ],
  tag: [p('M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.8 8.8a2 2 0 0 0 2.8 0l6.4-6.4a2 2 0 0 0 0-2.8z'), circle(7.5, 7.5, 1.3)],
  layers: [p('M12 2 2 7l10 5 10-5-10-5z'), p('M2 12l10 5 10-5'), p('M2 17l10 5 10-5')],
  cart: [circle(8, 21, 1), circle(19, 21, 1), p('M2.5 3h2l2.6 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6')],
  truck: [p('M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1'), p('M14 9h4l3 3v5a1 1 0 0 1-1 1h-1'), circle(7, 18, 2), circle(17, 18, 2)],
  workflow: [line(6, 3, 6, 15), circle(18, 6, 3), circle(6, 18, 3), p('M18 9a9 9 0 0 1-9 9')],
  chart: [line(3, 21, 21, 21), rect(5, 11, 3.6, 8, 1), rect(10.2, 6, 3.6, 13, 1), rect(15.4, 14, 3.6, 5, 1)],
  gear: [
    circle(12, 12, 3),
    p(
      'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
    ),
  ],
  shield: [p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')],
  building: [rect(4, 2, 16, 20, 2), p('M9 22v-4h6v4'), p('M8 6h.01'), p('M12 6h.01'), p('M16 6h.01'), p('M8 10h.01'), p('M12 10h.01'), p('M16 10h.01')],
  user: [circle(12, 8, 4), p('M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1')],
  search: [circle(11, 11, 7), p('M21 21l-4.3-4.3')],
  command: [p('M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3z')],
  bell: [p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), p('M10.3 21a1.9 1.9 0 0 0 3.4 0')],
  plus: [p('M12 5v14'), p('M5 12h14')],
  filter: [p('M22 3H2l8 9.5V19l4 2v-8.5L22 3z')],
  more: [circle(12, 12, 1), circle(19, 12, 1), circle(5, 12, 1)],
  sun: [circle(12, 12, 4), p('M12 2v2'), p('M12 20v2'), p('M4.9 4.9l1.4 1.4'), p('M17.7 17.7l1.4 1.4'), p('M2 12h2'), p('M20 12h2'), p('M4.9 19.1l1.4-1.4'), p('M17.7 6.3l1.4-1.4')],
  moon: [p('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z')],
  panel: [rect(3, 3, 18, 18, 2), line(9, 3, 9, 21)],
  star: [p('M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.8 5.2 21l1.5-7L1.5 9.3l7-.8L12 2z')],
  chevR: [p('M9 6l6 6-6 6')],
  chevD: [p('M6 9l6 6 6-6')],
  clock: [circle(12, 12, 9), p('M12 7v5l3 2')],
  mail: [rect(2, 4, 20, 16, 2), p('M2 6l10 7 10-7')],
  phone: [
    p(
      'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z',
    ),
  ],
  pin: [p('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z'), circle(12, 10, 3)],
  note: [p('M4 4h16v11l-5 5H4z'), p('M15 20v-5h5')],
  download: [p('M12 3v12'), p('M7 10l5 5 5-5'), p('M5 21h14')],
  arrowU: [p('M12 19V6'), p('M6 11l6-6 6 6')],
  arrowD: [p('M12 5v13'), p('M6 13l6 6 6-6')],
  x: [p('M18 6 6 18'), p('M6 6l12 12')],
  alert: [p('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'), p('M12 9v4'), p('M12 17h.01')],
  folder: [p('M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z')],
  globe: [circle(12, 12, 9), p('M3 12h18'), p('M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z')],
  link: [p('M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1'), p('M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1')],
  sparkles: [p('M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z'), p('M19 15l.9 2.3L22 18l-2.1.7L19 21l-.9-2.3L16 18l2.1-.7z')],
  dots: [circle(5, 6, 1.4), circle(12, 6, 1.4), circle(19, 6, 1.4), circle(5, 12, 1.4), circle(12, 12, 1.4), circle(19, 12, 1.4)],
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconName | string; size?: number; className?: string }) {
  const spec = ICONS[name] ?? [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {spec.map((s, i) => {
        if (s.tag === 'path') return <path key={i} d={s.d} />;
        if (s.tag === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} />;
        if (s.tag === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />;
        return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
      })}
    </svg>
  );
}
