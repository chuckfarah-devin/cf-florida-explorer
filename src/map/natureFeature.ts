/** Presentation only: source polygons never replace the selected evidence point. */
export interface NatureMapFeature {
  id: string;
  name: string;
  geometry?: { rings: number[][][]; spatialReference: { wkid: 4326 } };
}

export function validNatureGeometry(feature: NatureMapFeature): boolean {
  const geometry = feature.geometry;
  return geometry?.spatialReference?.wkid === 4326 && Array.isArray(geometry.rings) && geometry.rings.length > 0 && geometry.rings.every((ring) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90) && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1]);
}
