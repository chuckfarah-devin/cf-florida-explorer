import { checkPoint, messageFor, type LatLon } from '../config/bounds';

export type SelectionSource = 'pointer' | 'keyboard' | 'typed' | 'search';

export interface Selection {
  selectionId: number;
  point: LatLon;
  source: SelectionSource;
  placeName?: string;
}

export interface SelectionState {
  current: Selection | null;
  lastId: number;
  rejection: string | null;
}

export type SelectionAction =
  | { type: 'select'; point: LatLon; source: SelectionSource; placeName?: string }
  | { type: 'dismissRejection' };

export const initialSelection: SelectionState = { current: null, lastId: 0, rejection: null };

/** Out-of-bounds selections never replace the current point or advance selectionId (N22). */
export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'select': {
      const result = checkPoint(action.point);
      if (!result.ok) return { ...state, rejection: messageFor(result) };
      const selectionId = state.lastId + 1;
      return {
        current: { selectionId, point: result.point, source: action.source, placeName: action.placeName },
        lastId: selectionId,
        rejection: null,
      };
    }
    case 'dismissRejection':
      return { ...state, rejection: null };
  }
}
