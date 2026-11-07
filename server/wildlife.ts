export { cleanObservations, groupWildlife, createWildlifeHandler } from '../src/wildlife/service.ts';
export type { WildlifeRecord } from '../src/wildlife/service.ts';
import { createWildlifeHandler } from '../src/wildlife/service.ts';
export const handleWildlifeRequest = createWildlifeHandler();
