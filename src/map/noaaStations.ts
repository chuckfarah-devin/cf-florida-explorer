/** Presentation-only station locations supplied by the bound NOAA response. */
export interface TideStationMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
  waterBody: string;
  observed: boolean;
}

/** Do not interpret a station location or symbol as evidence at the selected point. */
export function stationLabel(station: TideStationMarker): string {
  return `${station.name} · ${station.waterBody} · ${station.observed ? 'Observed water levels' : 'Tide predictions only'}`;
}
