// @vitest-environment node
import { nearestBoundary } from './nature-geometry';
import type { NatureGeometry } from '../src/nature/types';

const point = { lat: 26.5, lon: -80.05 };
const geometry = (rings: number[][][]): NatureGeometry => ({ rings, spatialReference: { wkid: 4326 } });
const rectangle = (west: number, south: number, east: number, north: number) => [[west, south], [east, south], [east, north], [west, north], [west, south]];

describe('mapped-boundary distance', () => {
  it('matches the WGS84 meridian distance to a northern edge and gives north bearing', () => {
    const result = nearestBoundary(point, geometry([rectangle(-80.051, 26.51, -80.049, 26.511)]));
    // WGS84 meridional radius at 26.5deg: 6,348,097m; 0.01deg is about1107.956m.
    expect(result.distanceMeters).toBeGreaterThan(1107); expect(result.distanceMeters).toBeLessThan(1109); expect(result.bearing).toBe('N');
  });
  it('measures the closest boundary rather than centroid, including inner rings', () => {
    const outer = rectangle(-80.1, 26.45, -80.0, 26.55); const hole = rectangle(-80.051, 26.499, -80.049, 26.501);
    const result = nearestBoundary(point, geometry([outer, hole]));
    expect(result.distanceMeters).toBeGreaterThan(99); expect(result.distanceMeters).toBeLessThan(101);
  });
  it('finds the nearest boundary across multipart rings regardless of source ordering', () => {
    const far = rectangle(-80.0, 26.5, -79.99, 26.51); const near = rectangle(-80.049, 26.499, -80.048, 26.501);
    const a = nearestBoundary(point, geometry([far, near])); const b = nearestBoundary(point, geometry([near, far]));
    expect(a.distanceMeters).toBeCloseTo(b.distanceMeters, 6); expect(a.distanceMeters).toBeLessThan(101); expect(a.bearing).toBe('E');
  });
  it('densifies long edges so distance is stable when the same arc is explicitly split', () => {
    const west = -81; const east = -79.1; const lat = 26.51; const midLon = (west + east) / 2;
    const midLat = Math.atan(Math.tan(lat * Math.PI / 180) / Math.cos((east - west) / 2 * Math.PI / 180)) * 180 / Math.PI;
    const a = geometry([[[west, lat], [east, lat], [east, 27], [west, 27], [west, lat]]]);
    const b = geometry([[[west, lat], [midLon, midLat], [east, lat], [east, 27], [west, 27], [west, lat]]]);
    const x = nearestBoundary(point, a).distanceMeters; const y = nearestBoundary(point, b).distanceMeters;
    expect(Math.abs(x - y)).toBeLessThan(0.1); expect(x).toBeGreaterThan(1400);
  });
  it('returns zero for a point on a boundary and rejects a missing boundary', () => {
    const p = { lat: 26.5, lon: -80.049 };
    expect(nearestBoundary(p, geometry([rectangle(-80.049, 26.499, -80.048, 26.501)])).distanceMeters).toBeLessThan(0.02);
    expect(() => nearestBoundary(point, geometry([]))).toThrow();
  });
});
