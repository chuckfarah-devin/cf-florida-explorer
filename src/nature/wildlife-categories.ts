// iNaturalist taxonomy IDs verified against the public taxa API, 2026-11-05.
// These are discovery groups, not assertions that every species occurs at a point.
export const wildlifeGroups = [
  { id: 'reptiles', label: 'Reptiles', taxon: '26036', types: [
    { id: 'crocodilians', label: 'Alligators & crocodiles', taxon: '26039' },
    { id: 'snakes', label: 'Snakes', taxon: '85553' },
    { id: 'lizards', label: 'Lizards & geckos', taxon: '85552' },
    { id: 'turtles', label: 'Turtles & tortoises', taxon: '39532' },
  ] },
  { id: 'amphibians', label: 'Amphibians', taxon: '20978', types: [
    { id: 'frogs', label: 'Frogs & toads', taxon: '20979' },
    { id: 'salamanders', label: 'Salamanders, newts & sirens', taxon: '26718' },
  ] },
  { id: 'mammals', label: 'Mammals', taxon: '40151', types: [
    { id: 'land-mammals', label: 'Land mammals', taxon: '40151', exclude: '152871,46306,40268' },
    { id: 'marine-mammals', label: 'Manatees, dolphins & whales', taxon: '152871,46306' },
    { id: 'bats', label: 'Bats', taxon: '40268' },
    { id: 'bobcat', label: 'Bobcats', taxon: '41976' },
    { id: 'fox', label: 'Gray foxes', taxon: '42076' },
  ] },
  { id: 'birds', label: 'Birds', taxon: '3', types: [
    { id: 'raptors', label: 'Raptors & owls', taxon: '71261,67570,19350' },
    { id: 'waterfowl', label: 'Ducks, geese & swans', taxon: '6888' },
    { id: 'wading', label: 'Herons, egrets, ibises & pelicans', taxon: '67566' },
    { id: 'shorebirds', label: 'Shorebirds, gulls & terns', taxon: '67561' },
    { id: 'songbirds', label: 'Songbirds', taxon: '7251' },
  ] },
  { id: 'invertebrates', label: 'Invertebrates', taxon: '1', exclude: '355675', types: [
    { id: 'insects', label: 'Insects & butterflies', taxon: '47158' },
    { id: 'arachnids', label: 'Spiders & other arachnids', taxon: '47119' },
    { id: 'crustaceans', label: 'Crabs, lobsters & other crustaceans', taxon: '85493' },
    { id: 'molluscs', label: 'Shells, snails & other molluscs', taxon: '47115' },
    { id: 'corals', label: 'Corals, anemones & jellyfish', taxon: '47534' },
    { id: 'sponges', label: 'Sponges', taxon: '48824' },
    { id: 'echinoderms', label: 'Sea stars & sea urchins', taxon: '47549' },
    { id: 'horseshoe-crabs', label: 'Horseshoe crabs', taxon: '246165' },
  ] },
] as const;
export type WildlifeStatus = 'all' | 'native' | 'introduced' | 'unknown';
