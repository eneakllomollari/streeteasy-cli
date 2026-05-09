export interface ListingForOutput {
  price: number;
  netEffectivePrice: number | null;
  monthsFree: number | null;
  noFee: boolean;
  beds: number;
  baths: number;
  sqft: number | null;
  street: string;
  unit: string;
  area: string;
  url: string;
  description: string;
  amenities: string[];
  features: string[];
  transitStations: Array<{ name: string; distance: number; routes: string[] }>;
  petPolicy: { catsAllowed: boolean; dogsAllowed: boolean } | null;
  leaseTermMonths: number | null;
}

const RULE = '─'.repeat(60);

export function formatListing(l: ListingForOutput): string {
  const lines: string[] = [];
  lines.push(RULE);
  const fee = l.noFee ? 'NO FEE' : 'FEE';
  const net =
    l.netEffectivePrice && l.netEffectivePrice !== l.price
      ? ` (net effective: $${l.netEffectivePrice})`
      : '';
  const free = l.monthsFree ? ` | ${l.monthsFree}mo free` : '';
  lines.push(`$${l.price}/mo${net} | ${l.beds}BR/${l.baths}BA | ${fee}${free}`);
  lines.push(`${l.street}${l.unit ? ` ${l.unit}` : ''} — ${l.area}`);
  if (l.sqft) lines.push(`${l.sqft} sqft`);
  lines.push(l.url);
  if (l.description) {
    const desc = l.description.replace(/\n+/g, ' ').slice(0, 200);
    lines.push('');
    lines.push(`${desc}${l.description.length > 200 ? '...' : ''}`);
  }
  if (l.amenities.length) lines.push(`Amenities: ${l.amenities.join(', ')}`);
  if (l.features.length) lines.push(`Features: ${l.features.join(', ')}`);
  if (l.transitStations.length) {
    const t = l.transitStations
      .slice(0, 3)
      .map((s) => `${s.name} (${s.distance}mi) — ${s.routes.join(', ')}`)
      .join(' | ');
    lines.push(`Transit: ${t}`);
  }
  if (l.petPolicy) {
    const pets = [
      l.petPolicy.catsAllowed ? 'cats' : null,
      l.petPolicy.dogsAllowed ? 'dogs' : null,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(`Pets: ${pets || 'no pets'}`);
  }
  if (l.leaseTermMonths) lines.push(`Lease: ${l.leaseTermMonths} months`);
  lines.push('');
  return lines.join('\n');
}
