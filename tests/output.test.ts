import { describe, it, expect } from 'vitest';
import { formatListing, type ListingForOutput } from '../src/output.js';

const sample: ListingForOutput = {
  price: 4200,
  netEffectivePrice: 4000,
  monthsFree: 1,
  noFee: true,
  beds: 2,
  baths: 1,
  sqft: 800,
  street: '123 Test St',
  unit: '2A',
  area: 'Williamsburg',
  url: 'https://streeteasy.com/rental/9999999',
  description: 'Bright 2BR with central AC',
  amenities: ['DISHWASHER', 'CENTRAL_AC'],
  features: ['HARDWOOD_FLOORS'],
  transitStations: [{ name: 'Bedford Av', distance: 0.2, routes: ['L'] }],
  petPolicy: { catsAllowed: true, dogsAllowed: false },
  leaseTermMonths: 12,
};

describe('formatListing', () => {
  it('contains key facts', () => {
    const out = formatListing(sample);
    expect(out).toContain('$4200/mo');
    expect(out).toContain('net effective: $4000');
    expect(out).toContain('1mo free');
    expect(out).toContain('NO FEE');
    expect(out).toContain('2BR/1BA');
    expect(out).toContain('123 Test St 2A — Williamsburg');
    expect(out).toContain('800 sqft');
    expect(out).toContain('https://streeteasy.com/rental/9999999');
    expect(out).toContain('Bright 2BR with central AC');
    expect(out).toContain('Amenities: DISHWASHER, CENTRAL_AC');
    expect(out).toContain('Features: HARDWOOD_FLOORS');
    expect(out).toContain('Transit: Bedford Av (0.2mi) — L');
    expect(out).toContain('Pets: cats');
    expect(out).toContain('Lease: 12 months');
  });

  it('omits net-effective line when equal to price', () => {
    const out = formatListing({ ...sample, netEffectivePrice: sample.price });
    expect(out).not.toMatch(/net effective/);
  });

  it('marks FEE when noFee is false', () => {
    const out = formatListing({ ...sample, noFee: false });
    expect(out).toMatch(/\| FEE/);
  });
});
