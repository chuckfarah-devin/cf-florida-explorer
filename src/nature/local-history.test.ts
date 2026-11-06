import { expect, it } from 'vitest';
import { localHistory } from './local-history';
it('shows the sourced Briny chronology locally without presenting it as statewide history', () => {
  expect(localHistory({ lat: 26.5089, lon: -80.0522 })?.events.map((e) => e.date)).toEqual(['Early 1920s', '1930s', '1958', '1963']);
  expect(localHistory({ lat: 26.086, lon: -81.6 })).toBeNull();
});
