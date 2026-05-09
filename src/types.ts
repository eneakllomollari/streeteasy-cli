import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { AreaCode, Amenity } from './constants.js';

// Base response interface
export interface ApiResponse<T> {
  status: number;
  data: T;
}

// Error response interface
export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
}

// GraphQL error location type
export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

// GraphQL error extension type
export type GraphQLErrorExtensions = Record<string, unknown>;

// GraphQL error type
export interface GraphQLError {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: string[];
  extensions?: GraphQLErrorExtensions;
}

// Base response type for GraphQL queries
export type QueryResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

// Helper type for variables
export type Variables = Record<string, unknown>;

// We'll add more specific types here as we implement the API endpoints

// Rental Search Types
export type BuildingType =
  | "CO_OP"
  | "CONDO"
  | "MULTI_FAMILY"
  | "RENTAL"
  | "TOWNHOUSE";

export interface GeoPoint {
  __typename: string;
  latitude: number;
  longitude: number;
}

export interface LeadMediaPhoto {
  __typename: string;
  key: string;
}

export interface LeadMediaFloorPlan {
  __typename: string;
  key: string;
}

export interface LeadMedia {
  __typename: string;
  photo: LeadMediaPhoto;
  floorPlan?: LeadMediaFloorPlan;
}

export interface OpenHouseDigest {
  __typename: string;
  startTime: string;
  endTime: string;
  appointmentOnly: boolean;
}

export interface SearchRentalListing {
  __typename: string;
  id: string;
  areaName: string;
  availableAt: string | null;
  bedroomCount: number;
  buildingType: BuildingType;
  fullBathroomCount: number;
  furnished: boolean;
  geoPoint: GeoPoint;
  halfBathroomCount: number;
  hasTour3d: boolean;
  hasVideos: boolean;
  isNewDevelopment: boolean;
  leadMedia: LeadMedia;
  leaseTermMonths: number | null;
  livingAreaSize: number | null;
  mediaAssetCount: number;
  monthsFree: number | null;
  noFee: boolean;
  netEffectivePrice: number | null;
  offMarketAt: string | null;
  photos: LeadMediaPhoto[];
  price: number;
  priceChangedAt: string | null;
  priceDelta: number | null;
  slug: string;
  sourceGroupLabel: string;
  sourceType: string;
  status: string;
  street: string;
  unit: string;
  upcomingOpenHouse: OpenHouseDigest | null;
  urlPath: string;
}

export interface OrganicRentalEdge {
  __typename: string;
  node: SearchRentalListing;
  amenitiesMatch: boolean;
  matchedAmenities: string[];
  missingAmenities: string[];
}

export interface FeaturedRentalEdge {
  __typename: string;
  node: SearchRentalListing;
  amenitiesMatch: boolean;
  matchedAmenities: string[];
  missingAmenities: string[];
}

export interface SponsoredRentalEdge {
  __typename: string;
  node: SearchRentalListing;
  sponsoredSimilarityLabel: string;
}

export type RentalEdge =
  | OrganicRentalEdge
  | FeaturedRentalEdge
  | SponsoredRentalEdge;

export interface SearchRentalsResponse {
  searchRentals: {
    __typename: string;
    edges: RentalEdge[];
    totalCount: number;
  };
}

export interface NumberRange {
  lowerBound: number | null;
  upperBound: number | null;
}

export interface SearchFilters {
  areas?: AreaCode[];
  rentalStatus?: "ACTIVE";
  price?: NumberRange;
  bedrooms?: NumberRange;
  bathrooms?: NumberRange;
  amenities?: Amenity[];
  petsAllowed?: boolean;
  noFee?: boolean;
}

export interface Sorting {
  attribute: "RECOMMENDED" | "PRICE" | "LISTED_AT" | "INTERESTING_CHANGE_AT" | "SQFT";
  direction: "ASCENDING" | "DESCENDING";
}

export interface SearchRentalsInput {
  sorting?: Sorting;
  adStrategy?: "NONE";
  filters: SearchFilters;
  perPage?: number;
  page?: number;
  userSearchToken?: string;
}

export interface RentalSearchVariables {
  input: SearchRentalsInput;
}

// Rental Listing Details Types

export interface RentalListingDetailsVariables {
  listingID: string;
}

export interface Address {
  __typename: string;
  street: string;
  houseNumber?: string;
  streetName?: string;
  city: string;
  state: string;
  zipCode: string;
  unit?: string;
}

export interface Photo {
  __typename: string;
  key: string;
}

export interface FloorPlan {
  __typename: string;
  key: string;
}

export interface Video {
  __typename: string;
  imageUrl: string;
  id: string;
  provider: string;
}

export interface Media {
  __typename: string;
  photos: Photo[];
  floorPlans: FloorPlan[];
  videos: Video[];
  tour3dUrl: string | null;
  assetCount: number;
}

export interface BuildingAmenities {
  __typename: string;
  list: string[];
  doormanTypes: string[];
  parkingTypes: string[];
  sharedOutdoorSpaceTypes: string[];
  storageSpaceTypes: string[];
}

export interface PropertyFeatures {
  __typename: string;
  list: string[];
  fireplaceTypes: string[];
  privateOutdoorSpaceTypes: string[];
  views: string[];
}

export interface PropertyDetails {
  __typename: string;
  address: Address;
  roomCount: number;
  bedroomCount: number;
  fullBathroomCount: number;
  halfBathroomCount: number;
  livingAreaSize: number;
  amenities: BuildingAmenities;
  features: PropertyFeatures;
}

export interface RentalBackOffice {
  __typename: string;
  brokerageListingId: string | null;
}

export interface PriceChange {
  __typename: string;
  changedAt: string;
}

export interface RentalPricing {
  __typename: string;
  leaseTermMonths: number | null;
  monthsFree: number | null;
  noFee: boolean;
  price: number;
  priceDelta: number | null;
  priceChanges: PriceChange[];
}

export interface PriceStats {
  __typename: string;
  medianPrice: number;
}

export interface NeighborhoodPriceStats {
  __typename: string;
  rentalPriceStats: PriceStats;
  salePriceStats: PriceStats;
}

export interface OpenHouse {
  __typename: string;
  id: string;
  startTime: string;
  endTime: string;
  appointmentOnly: boolean;
}

export interface ListingSource {
  __typename: string;
  sourceType: string;
}

export interface PriceChangeOfInterest {
  __typename: string;
  pricePercentChange?: number;
}

export interface RentalStatusChangeOfInterest extends PriceChangeOfInterest {
  date: string;
  price: number;
  status: string;
}

export interface RentalListingChangesOfInterest {
  __typename: string;
  listingId: string;
  sourceGroupLabel: string;
  photos: Photo[];
  offMarketAt: string | null;
  rentalEventsOfInterest: RentalStatusChangeOfInterest[];
}

export interface RentalStatusChange {
  __typename: string;
  status: string;
  changedAt: string;
}

export interface DetailedRentalListing {
  __typename: string;
  id: string;
  offMarketAt: string | null;
  availableAt: string;
  buildingId: string;
  status: string;
  statusChanges: RentalStatusChange[];
  createdAt: string;
  updatedAt: string;
  interestingChangeAt: string;
  description: string;
  media: Media;
  propertyDetails: PropertyDetails;
  mlsNumber: string | null;
  backOffice: RentalBackOffice;
  pricing: RentalPricing;
  recentListingsPriceStats: NeighborhoodPriceStats;
  upcomingOpenHouses: OpenHouse[];
  listingSource: ListingSource;
  propertyHistory: RentalListingChangesOfInterest[];
}

export interface BuildingAdditionalDetails {
  __typename: string;
  leasingStartDate: string | null;
  salesStartDate: string | null;
}

export interface HeroImage {
  __typename: string;
  key: string | null;
}

export interface Complex {
  __typename: string;
  id: string;
  name: string;
}

export interface Area {
  __typename: string;
  name: string;
}

export interface ListingDigest {
  __typename: string;
  id: string;
}

export interface SaleInventorySummary {
  __typename: string;
  availableListingDigests: ListingDigest[];
}

export interface RentalInventorySummary {
  __typename: string;
  availableListingDigests: ListingDigest[];
}

export interface PetPolicy {
  __typename: string;
  catsAllowed: boolean;
  dogsAllowed: boolean;
  maxDogWeight: number | null;
  restrictedDogBreeds: string[];
}

export interface Policies {
  __typename: string;
  list: string[];
  petPolicy: PetPolicy;
}

export interface Geo {
  __typename: string;
  latitude: number;
  longitude: number;
}

export interface TransitStation {
  __typename: string;
  name: string;
  distance: number;
  routes: string[];
  geo: Geo;
}

export interface Nearby {
  __typename: string;
  transitStations: TransitStation[];
}

export interface Building {
  __typename: string;
  id: string;
  name: string;
  type: string;
  residentialUnitCount: number;
  yearBuilt: number;
  status: string;
  additionalDetails: BuildingAdditionalDetails;
  address: Address;
  heroImage: HeroImage | null;
  media: Media;
  complex: Complex | null;
  area: Area;
  saleInventorySummary: SaleInventorySummary;
  rentalInventorySummary: RentalInventorySummary;
  isLandLease: boolean | null;
  policies: Policies | null;
  nearby: Nearby;
}

export interface SchoolExpress {
  __typename: string;
  name: string;
  district: string;
  grades: string[];
  id: string;
  idstr: string;
  geoCenter: Geo;
}

export interface BuildingExpress {
  __typename: string;
  nearbySchools: SchoolExpress[];
}

export interface RelloExpress {
  __typename: string;
  rentalId: string;
  ctaEnabled: boolean;
  link: string;
}

export interface RentalListingExpress {
  __typename: string;
  hasActiveBuildingShowcase: boolean;
}

export interface RentalListingDetailsResponse {
  rentalByListingId: DetailedRentalListing;
  buildingByRentalListingId: Building;
  getBuildingExpressByRentalListingId: BuildingExpress;
  getRelloRentalById: RelloExpress | null;
  getRentalListingExpressById: RentalListingExpress;
}

// Re-export useful GraphQL types
export type { TypedDocumentNode };
