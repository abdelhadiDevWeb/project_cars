'use client';

import { getWorkshopMapProvider, type WorkshopLocationPickerProps } from './workshopLocationShared';
import WorkshopLocationPickerGoogle from './WorkshopLocationPickerGoogle';
import WorkshopLocationPickerOsm from './WorkshopLocationPickerOsm';

export type {
  WorkshopLocationAddressDetails,
  WorkshopLocationValue,
  WorkshopLocationPickerProps,
} from './workshopLocationShared';
export { GOOGLE_CLOUD_BILLING_URL, getWorkshopMapProvider } from './workshopLocationShared';
export { parseAddressDetailsFromComponents } from './WorkshopLocationPickerGoogle';

/**
 * Workshop map: Google Maps (needs billing) or OpenStreetMap (set NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER=osm).
 */
export default function WorkshopLocationPicker(props: WorkshopLocationPickerProps) {
  if (getWorkshopMapProvider() === 'osm') {
    return <WorkshopLocationPickerOsm {...props} />;
  }
  return <WorkshopLocationPickerGoogle {...props} />;
}
