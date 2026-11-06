export function localHistory(point: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const h = Math.sin((point.lat - 26.5089) * rad / 2) ** 2 + Math.cos(point.lat * rad) * Math.cos(26.5089 * rad) * Math.sin((point.lon + 80.0522) * rad / 2) ** 2;
  // A nearby-story discovery radius, not a municipal boundary or point-membership assertion.
  if (12742 * Math.asin(Math.min(1, Math.sqrt(h))) > 2) return null;
  return {
    title: 'Briny Breezes: from farms to a town',
    scope: 'A local story near your selected spot',
    events: [
      { date: 'Early 1920s', title: 'Shore Acres dairy', text: 'Ward and Agnes Miller developed oceanfront land with a dairy operation. The Boynton Beach Historical Society documents the Shore Acres farm and its cattle.', url: 'https://www.boyntonhistory.org/ward-millers-briny-breezes-the-early-years/', source: 'Boynton Beach Historical Society' },
      { date: '1930s', title: 'Strawberries and campers', text: 'The Millers grew strawberries and welcomed travel trailers during the Depression. Farming and camping both feature in the community’s early history.', url: 'https://education.pbchistory.org/pbc_community/briny-breezes/', source: 'Historical Society of Palm Beach County' },
      { date: '1958', title: 'Residents buy the land', text: 'Residents pooled their money to buy the Miller property for $1.5 million.', url: 'https://education.pbchistory.org/pbc_community/briny-breezes/', source: 'Historical Society of Palm Beach County' },
      { date: '1963', title: 'Briny becomes a town', text: 'The trailer-park community incorporated as the Town of Briny Breezes.', url: 'https://boyntonbeachhistory.omeka.net/items/show/3180', source: 'Boynton Beach City Library Local History Archives' },
    ],
  };
}
