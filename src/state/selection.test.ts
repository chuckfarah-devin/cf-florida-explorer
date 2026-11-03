import { initialSelection, selectionReducer } from './selection';

describe('selectionReducer', () => {
  it('assigns monotonic selection ids', () => {
    let s = selectionReducer(initialSelection, { type: 'select', point: { lat: 26.5, lon: -80.05 }, source: 'pointer' });
    s = selectionReducer(s, { type: 'select', point: { lat: 26.6, lon: -80.06 }, source: 'keyboard' });
    expect(s.current?.selectionId).toBe(2);
    expect(s.current?.source).toBe('keyboard');
  });
  it.each(['pointer', 'keyboard', 'typed', 'search'] as const)('keeps the current point when a %s selection is out of bounds (N22)', (source) => {
    const s1 = selectionReducer(initialSelection, { type: 'select', point: { lat: 26.5, lon: -80.05 }, source: 'pointer' });
    const s2 = selectionReducer(s1, { type: 'select', point: { lat: 25, lon: -78 }, source });
    expect(s2.current).toBe(s1.current);
    expect(s2.lastId).toBe(1);
    expect(s2.rejection).toMatch(/outside Florida/);
  });
  it('clears the rejection on the next valid selection', () => {
    const s1 = selectionReducer(initialSelection, { type: 'select', point: { lat: 25, lon: -78 }, source: 'typed' });
    const s2 = selectionReducer(s1, { type: 'select', point: { lat: 26.5, lon: -80.05 }, source: 'typed' });
    expect(s2.rejection).toBeNull();
  });
});
