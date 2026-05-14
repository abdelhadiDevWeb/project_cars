'use client';

import {
  addressDetailsFromStoredLocation,
  hasWorkshopAddressDetails,
  type WorkshopLocationAddressDetails,
  type WorkshopLocationValue,
} from './workshopLocationShared';

function mergeAddressDetails(
  live: WorkshopLocationAddressDetails | null,
  stored: WorkshopLocationAddressDetails | null
): WorkshopLocationAddressDetails | null {
  if (!hasWorkshopAddressDetails(live) && !hasWorkshopAddressDetails(stored)) return null;
  if (!hasWorkshopAddressDetails(live)) return stored;
  if (!hasWorkshopAddressDetails(stored)) return live;
  if (live && stored) {
    return {
      streetLine: live.streetLine ?? stored.streetLine,
      neighborhood: live.neighborhood ?? stored.neighborhood,
      locality: live.locality ?? stored.locality,
      administrativeAreaLevel2: live.administrativeAreaLevel2 ?? stored.administrativeAreaLevel2,
      administrativeAreaLevel1: live.administrativeAreaLevel1 ?? stored.administrativeAreaLevel1,
      postalCode: live.postalCode ?? stored.postalCode,
      country: live.country ?? stored.country,
    };
  }
  return null;
}

export default function WorkshopLocationDetailsPanel({
  value,
  addressDetails,
}: {
  value: WorkshopLocationValue;
  addressDetails: WorkshopLocationAddressDetails | null;
}) {
  const fromDb = addressDetailsFromStoredLocation(value);
  const effective = mergeAddressDetails(addressDetails, fromDb);
  const showStructured = hasWorkshopAddressDetails(effective);
  const showLoadingHint = !showStructured && !value.formattedAddress?.trim();

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Détail de la localisation</p>
      {value.formattedAddress?.trim() ? (
        <p className="rounded-lg border border-gray-100 bg-white/90 px-3 py-2 text-sm text-gray-900">
          <span className="text-gray-500">Adresse : </span>
          <span className="font-medium">{value.formattedAddress}</span>
        </p>
      ) : null}
      {showStructured && effective ? (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {effective.streetLine && (
            <>
              <dt className="text-gray-500">Rue / lieu-dit</dt>
              <dd className="font-medium text-gray-900">{effective.streetLine}</dd>
            </>
          )}
          {effective.neighborhood && (
            <>
              <dt className="text-gray-500">Quartier</dt>
              <dd className="font-medium text-gray-900">{effective.neighborhood}</dd>
            </>
          )}
          {effective.locality && (
            <>
              <dt className="text-gray-500">Ville</dt>
              <dd className="font-medium text-gray-900">{effective.locality}</dd>
            </>
          )}
          {effective.administrativeAreaLevel2 && !effective.locality && (
            <>
              <dt className="text-gray-500">Commune / daïra</dt>
              <dd className="font-medium text-gray-900">{effective.administrativeAreaLevel2}</dd>
            </>
          )}
          {effective.administrativeAreaLevel1 && (
            <>
              <dt className="text-gray-500">Wilaya / région</dt>
              <dd className="font-medium text-gray-900">{effective.administrativeAreaLevel1}</dd>
            </>
          )}
          {effective.postalCode && (
            <>
              <dt className="text-gray-500">Code postal</dt>
              <dd className="font-medium text-gray-900">{effective.postalCode}</dd>
            </>
          )}
          {effective.country && (
            <>
              <dt className="text-gray-500">Pays</dt>
              <dd className="font-medium text-gray-900">{effective.country}</dd>
            </>
          )}
        </dl>
      ) : showLoadingHint ? (
        <p className="text-xs text-gray-500">
          Analyse de l’adresse en cours… Si rien n’apparaît, déplacez le marqueur ou utilisez la recherche.
        </p>
      ) : null}
      <p className="border-t border-gray-200 pt-2 text-xs text-gray-600">
        Coordonnées GPS : {value.lat!.toFixed(6)}, {value.lng!.toFixed(6)}
      </p>
    </div>
  );
}
