/** Algeria — default map center when no pin yet */
export const DEFAULT_CENTER = { lat: 36.7538, lng: 3.0588 };

/** Google Cloud: enable billing for Maps / Places on this project. */
export const GOOGLE_CLOUD_BILLING_URL =
  'https://console.cloud.google.com/project/_/billing/enable';

export type WorkshopLocationAddressDetails = {
  streetLine: string | null;
  neighborhood: string | null;
  locality: string | null;
  administrativeAreaLevel1: string | null;
  administrativeAreaLevel2: string | null;
  postalCode: string | null;
  country: string | null;
};

export type WorkshopLocationValue = {
  lat: number | null;
  lng: number | null;
  formattedAddress: string;
  googlePlaceId: string | null;
  /** Persisted on Workshop — filled from geocoder breakdown */
  locationCity?: string | null;
  locationRegion?: string | null;
  locationPostalCode?: string | null;
  locationCountry?: string | null;
  locationNeighborhood?: string | null;
  locationStreetLine?: string | null;
};

export function hasWorkshopAddressDetails(d: WorkshopLocationAddressDetails | null | undefined): boolean {
  if (!d) return false;
  return !!(
    d.streetLine ||
    d.neighborhood ||
    d.locality ||
    d.administrativeAreaLevel2 ||
    d.administrativeAreaLevel1 ||
    d.postalCode ||
    d.country
  );
}

/** Rebuild UI breakdown from fields already saved on the workshop (when live geocoder detail is missing). */
export function addressDetailsFromStoredLocation(value: WorkshopLocationValue): WorkshopLocationAddressDetails | null {
  const d: WorkshopLocationAddressDetails = {
    streetLine: value.locationStreetLine ?? null,
    neighborhood: value.locationNeighborhood ?? null,
    locality: value.locationCity ?? null,
    administrativeAreaLevel1: value.locationRegion ?? null,
    administrativeAreaLevel2: null,
    postalCode: value.locationPostalCode ?? null,
    country: value.locationCountry ?? null,
  };
  return hasWorkshopAddressDetails(d) ? d : null;
}

/** Map UI address breakdown → MongoDB workshop location_* fields */
export function storedLocationPartsFromDetails(
  details: WorkshopLocationAddressDetails | null
): Pick<
  WorkshopLocationValue,
  | 'locationCity'
  | 'locationRegion'
  | 'locationPostalCode'
  | 'locationCountry'
  | 'locationNeighborhood'
  | 'locationStreetLine'
> {
  if (!details) {
    return {
      locationCity: null,
      locationRegion: null,
      locationPostalCode: null,
      locationCountry: null,
      locationNeighborhood: null,
      locationStreetLine: null,
    };
  }
  return {
    locationCity: details.locality,
    locationRegion: details.administrativeAreaLevel1,
    locationPostalCode: details.postalCode,
    locationCountry: details.country,
    locationNeighborhood: details.neighborhood,
    locationStreetLine: details.streetLine,
  };
}

export type WorkshopLocationPickerProps = {
  apiKey: string | undefined;
  value: WorkshopLocationValue;
  onChange: (v: WorkshopLocationValue) => void;
  className?: string;
  autoLocateIfEmpty?: boolean;
};

/** Map zoom level from reported GPS horizontal accuracy (meters). */
export function mapZoomForGpsAccuracy(accuracyM: number): number {
  if (!Number.isFinite(accuracyM)) return 16;
  if (accuracyM > 500) return 11;
  if (accuracyM > 250) return 12;
  if (accuracyM > 150) return 13;
  if (accuracyM > 90) return 14;
  if (accuracyM > 50) return 15;
  if (accuracyM > 30) return 16;
  return 17;
}

/** `osm` = OpenStreetMap + Leaflet (no Google script → no BillingNotEnabledMapError). `google` = Google Maps. */
export function getWorkshopMapProvider(): 'google' | 'osm' {
  const p = (process.env.NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER || '').toLowerCase().trim();
  if (p === 'osm' || p === 'openstreetmap') return 'osm';
  if (p === 'google') return 'google';
  return 'google';
}
