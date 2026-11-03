import type { ReferenceLayerConfig } from '../config/layers';

/** Which reference layers a failed service request belongs to. Requests naming no sublayer (e.g. map export) affect every layer on that service. */
export function layersForFailedUrl(url: string, layers: readonly ReferenceLayerConfig[]): string[] {
  const onService = layers.filter((l) => url === l.serviceUrl || url.startsWith(`${l.serviceUrl}/`) || url.startsWith(`${l.serviceUrl}?`));
  if (onService.length === 0) return [];
  const sub = /^\/(\d+)(?:[/?]|$)/.exec(url.slice(onService[0].serviceUrl.length));
  if (!sub) return onService.map((l) => l.id);
  return onService.filter((l) => String(l.sublayerId) === sub[1]).map((l) => l.id);
}
