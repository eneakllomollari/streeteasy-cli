export interface SummaryDTO {
  id: string;
  url: string;
  price: number;
  netEffectivePrice: number | null;
  monthsFree: number | null;
  noFee: boolean;
  beds: number;
  baths: number;
  sqft: number | null;
  address: string;
  area: string;
  floor: number | null;
  daysOnMarket: number | null;
  availableAt: string | null;
  description: string;
  amenities: string[];
  features: string[];
  transitStations: Array<{ name: string; distance: number; routes: string[] }>;
  petPolicy: { catsAllowed: boolean; dogsAllowed: boolean } | null;
  leaseTermMonths: number | null;
}

export interface SummarySearchHints {
  areaName: string | undefined;
  urlPath: string | undefined;
}

interface DetailLike {
  rentalByListingId?: {
    id?: string;
    description?: string;
    availableAt?: string | null;
    createdAt?: string;
    propertyDetails?: {
      bedroomCount?: number;
      fullBathroomCount?: number;
      livingAreaSize?: number | null;
      floor?: number | null;
      address?: { street?: string; unit?: string; city?: string };
      amenities?: {
        list?: string[];
        doormanTypes?: string[];
        sharedOutdoorSpaceTypes?: string[];
      };
      features?: { list?: string[] };
    };
    pricing?: {
      price?: number;
      netEffectivePrice?: number | null;
      monthsFree?: number | null;
      noFee?: boolean;
      leaseTermMonths?: number | null;
    };
  };
  buildingByRentalListingId?: {
    policies?: { petPolicy?: { catsAllowed: boolean; dogsAllowed: boolean } };
    nearby?: {
      transitStations?: Array<{
        name: string;
        distance: number;
        routes: string[];
      }>;
    };
  };
}

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

export function projectSummary(
  d: DetailLike,
  hints: SummarySearchHints,
): SummaryDTO {
  const r = d.rentalByListingId ?? {};
  const pd = r.propertyDetails ?? {};
  const pricing = r.pricing ?? {};
  const b = d.buildingByRentalListingId ?? {};

  const id = r.id ?? '';
  const street = pd.address?.street ?? '';
  const unit = pd.address?.unit ?? '';
  const address = unit ? `${street} ${unit}` : street;
  const url = hints.urlPath
    ? `https://streeteasy.com${hints.urlPath}`
    : `https://streeteasy.com/rental/${id}`;

  return {
    id,
    url,
    price: pricing.price ?? 0,
    netEffectivePrice: pricing.netEffectivePrice ?? null,
    monthsFree: pricing.monthsFree ?? null,
    noFee: pricing.noFee ?? false,
    beds: pd.bedroomCount ?? 0,
    baths: pd.fullBathroomCount ?? 0,
    sqft: pd.livingAreaSize ?? null,
    address,
    area: hints.areaName ?? pd.address?.city ?? '',
    floor: pd.floor ?? null,
    daysOnMarket: daysSince(r.createdAt),
    availableAt: r.availableAt ?? null,
    description: r.description ?? '',
    amenities: pd.amenities?.list ?? [],
    features: pd.features?.list ?? [],
    transitStations: (b.nearby?.transitStations ?? []).map((s) => ({
      name: s.name,
      distance: s.distance,
      routes: s.routes,
    })),
    petPolicy: b.policies?.petPolicy
      ? {
          catsAllowed: b.policies.petPolicy.catsAllowed,
          dogsAllowed: b.policies.petPolicy.dogsAllowed,
        }
      : null,
    leaseTermMonths: pricing.leaseTermMonths ?? null,
  };
}
