import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectSummary } from '../src/summary.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures', 'details-response.json'), 'utf-8'),
);

describe('projectSummary', () => {
  it('returns an object with all required fields', () => {
    const s = projectSummary(fixture, {
      areaName: 'Williamsburg',
      urlPath: '/rental/9999999',
    });
    const required = [
      'id',
      'url',
      'price',
      'netEffectivePrice',
      'monthsFree',
      'noFee',
      'beds',
      'baths',
      'sqft',
      'address',
      'area',
      'floor',
      'daysOnMarket',
      'availableAt',
      'description',
      'amenities',
      'features',
      'transitStations',
      'petPolicy',
      'leaseTermMonths',
    ];
    for (const k of required) {
      expect(s).toHaveProperty(k);
    }
  });

  it('builds a full streeteasy.com URL from urlPath', () => {
    const s = projectSummary(fixture, {
      areaName: 'X',
      urlPath: '/rental/9999999',
    });
    expect(s.url).toBe('https://streeteasy.com/rental/9999999');
  });

  it('falls back to /rental/<id> when no urlPath given', () => {
    const s = projectSummary(fixture, { areaName: 'X', urlPath: undefined });
    expect(s.url).toMatch(/^https:\/\/streeteasy\.com\/rental\//);
  });

  it('uses null for missing pricing fields', () => {
    const skinny = {
      rentalByListingId: {
        id: '1',
        propertyDetails: {
          bedroomCount: 1,
          fullBathroomCount: 1,
          address: {},
          amenities: { list: [] },
          features: { list: [] },
        },
        pricing: { price: 3000 },
      },
      buildingByRentalListingId: {},
    };
    const s = projectSummary(skinny, { areaName: 'X', urlPath: '/rental/1' });
    expect(s.netEffectivePrice).toBeNull();
    expect(s.monthsFree).toBeNull();
    expect(s.noFee).toBe(false);
    expect(s.leaseTermMonths).toBeNull();
    expect(s.transitStations).toEqual([]);
    expect(s.petPolicy).toBeNull();
  });

  it('strips __typename from transitStations and petPolicy', () => {
    const withTypename = {
      rentalByListingId: {
        id: '1',
        propertyDetails: {
          bedroomCount: 2,
          fullBathroomCount: 1,
          address: {},
          amenities: { list: [] },
          features: { list: [] },
        },
        pricing: { price: 4000 },
      },
      buildingByRentalListingId: {
        policies: {
          petPolicy: {
            __typename: 'PetPolicy',
            catsAllowed: true,
            dogsAllowed: false,
          },
        },
        nearby: {
          transitStations: [
            {
              __typename: 'TransitStation',
              name: 'Bedford Av',
              distance: 0.2,
              routes: ['L'],
            },
          ],
        },
      },
    };
    const s = projectSummary(withTypename, {
      areaName: 'X',
      urlPath: '/rental/1',
    });
    expect(s.transitStations[0]).not.toHaveProperty('__typename');
    expect(s.transitStations[0]).toEqual({
      name: 'Bedford Av',
      distance: 0.2,
      routes: ['L'],
    });
    expect(s.petPolicy).not.toHaveProperty('__typename');
    expect(s.petPolicy).toEqual({ catsAllowed: true, dogsAllowed: false });
  });
});
