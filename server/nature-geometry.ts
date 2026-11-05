import type { LatLon } from '../src/config/bounds.ts';
import type { NatureFeature } from '../src/nature/types.ts';
type Geometry = NonNullable<NatureFeature['geometry']>;
const RAD = Math.PI / 180;
function ecef(lon: number, lat: number) {
  const p = lat * RAD; const l = lon * RAD; const e2 = 6.6943799901413165e-3;
  const n = 6378137 / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  return [n * Math.cos(p) * Math.cos(l), n * Math.cos(p) * Math.sin(l), n * (1 - e2) * Math.sin(p)];
}
/** Local WGS84 tangent-plane boundary distance; long geographic edges are densified first. */
export function nearestBoundary(point: LatLon, geometry: Geometry) {
  const origin = ecef(point.lon, point.lat); const p = point.lat * RAD; const l = point.lon * RAD;
  const project = (v: number[]) => { const xyz = ecef(v[0], v[1]).map((n, i) => n - origin[i]); return [-Math.sin(l) * xyz[0] + Math.cos(l) * xyz[1], -Math.sin(p) * Math.cos(l) * xyz[0] - Math.sin(p) * Math.sin(l) * xyz[1] + Math.cos(p) * xyz[2]]; };
  let best = Infinity; let direction = 0;
  const segment = (a: number[], b: number[]) => {
    const av = project(a); const bv = project(b); const dx = bv[0] - av[0]; const dy = bv[1] - av[1];
    const length = dx * dx + dy * dy; const t = length ? Math.max(0, Math.min(1, -(av[0] * dx + av[1] * dy) / length)) : 0;
    const x = av[0] + t * dx; const y = av[1] + t * dy; const d = Math.hypot(x, y);
    if (d < best) { best = d; direction = (Math.atan2(x, y) / RAD + 360) % 360; }
  };
  for (const ring of geometry.rings) for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1]; const b = ring[i];
    const u = [Math.cos(a[1] * RAD) * Math.cos(a[0] * RAD), Math.cos(a[1] * RAD) * Math.sin(a[0] * RAD), Math.sin(a[1] * RAD)];
    const v = [Math.cos(b[1] * RAD) * Math.cos(b[0] * RAD), Math.cos(b[1] * RAD) * Math.sin(b[0] * RAD), Math.sin(b[1] * RAD)];
    const angle = Math.acos(Math.max(-1, Math.min(1, u.reduce((n, x, j) => n + x * v[j], 0))));
    const steps = Math.max(1, Math.ceil(angle * 6371008.8 / 500)); let last = a;
    if (steps > 5000) throw new Error('Unsupported polygon edge');
    for (let j = 1; j <= steps; j++) {
      let next = b;
      if (j < steps && angle > 1e-10) { const t = j / steps; const w = u.map((x, k) => (Math.sin((1 - t) * angle) * x + Math.sin(t * angle) * v[k]) / Math.sin(angle)); next = [Math.atan2(w[1], w[0]) / RAD, Math.atan2(w[2], Math.hypot(w[0], w[1])) / RAD]; }
      segment(last, next); last = next;
    }
  }
  if (!Number.isFinite(best)) throw new Error('Missing polygon boundary');
  return { distanceMeters: best, bearing: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(direction / 45) % 8] };
}
