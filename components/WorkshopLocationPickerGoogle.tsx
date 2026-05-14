'use client';

import { useEffect, useRef, useState } from 'react';
import WorkshopLocationDetailsPanel from './WorkshopLocationDetailsPanel';
import { acquireBestGeolocation } from '@/utils/acquireGeolocation';
import {
  DEFAULT_CENTER,
  GOOGLE_CLOUD_BILLING_URL,
  hasWorkshopAddressDetails,
  mapZoomForGpsAccuracy,
  storedLocationPartsFromDetails,
  type WorkshopLocationAddressDetails,
  type WorkshopLocationPickerProps,
} from './workshopLocationShared';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

const mapsAuthFailureListeners = new Set<() => void>();

function notifyMapsAuthFailure() {
  mapsAuthFailureListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

let gmAuthFailureHookInstalled = false;

function installGmAuthFailureHookOnce() {
  if (typeof window === 'undefined' || gmAuthFailureHookInstalled) return;
  gmAuthFailureHookInstalled = true;
  window.gm_authFailure = () => {
    notifyMapsAuthFailure();
  };
}

function getComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  ...types: string[]
): string | null {
  if (!components?.length) return null;
  for (const t of types) {
    const c = components.find((x) => x.types.includes(t));
    if (c?.long_name) return c.long_name;
  }
  return null;
}

export function parseAddressDetailsFromComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): WorkshopLocationAddressDetails | null {
  if (!components?.length) return null;
  const streetNumber = getComponent(components, 'street_number');
  const route = getComponent(components, 'route');
  const streetLine = [streetNumber, route].filter(Boolean).join(' ').trim() || null;
  const details: WorkshopLocationAddressDetails = {
    streetLine,
    neighborhood:
      getComponent(components, 'sublocality', 'sublocality_level_1', 'neighborhood') ||
      getComponent(components, 'premise'),
    locality:
      getComponent(components, 'locality') ||
      getComponent(components, 'administrative_area_level_2') ||
      getComponent(components, 'postal_town'),
    administrativeAreaLevel1: getComponent(components, 'administrative_area_level_1'),
    administrativeAreaLevel2: getComponent(components, 'administrative_area_level_2'),
    postalCode: getComponent(components, 'postal_code'),
    country: getComponent(components, 'country'),
  };
  return hasWorkshopAddressDetails(details) ? details : null;
}

let mapsScriptPromise: Promise<void> | null = null;

function ensureGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.maps) return Promise.resolve();

  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      installGmAuthFailureHookOnce();
      const id = 'google-maps-js';
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        const check = () => {
          if (window.google?.maps) resolve();
        };
        if (window.google?.maps) {
          check();
          return;
        }
        existing.addEventListener('load', check);
        existing.addEventListener('error', () => reject(new Error('Maps script error')));
        return;
      }
      const s = document.createElement('script');
      s.id = id;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Échec du chargement de Google Maps'));
      document.head.appendChild(s);
    });
  }
  return mapsScriptPromise;
}

export default function WorkshopLocationPickerGoogle({
  apiKey,
  value,
  onChange,
  className = '',
  autoLocateIfEmpty = false,
}: WorkshopLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapsBillingBlocked, setMapsBillingBlocked] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [addressDetails, setAddressDetails] = useState<WorkshopLocationAddressDetails | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const applyGeocodeResult = (lat: number, lng: number, result: google.maps.GeocoderResult) => {
    const details = parseAddressDetailsFromComponents(result.address_components);
    setAddressDetails(details);
    onChangeRef.current({
      lat,
      lng,
      formattedAddress: result.formatted_address || '',
      googlePlaceId: result.place_id || null,
      ...storedLocationPartsFromDetails(details),
    });
  };

  useEffect(() => {
    if (!apiKey) {
      setLoadError('Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans client/.env.local (clé Google Maps JavaScript API).');
      return;
    }

    setLoadError(null);
    setMapsBillingBlocked(false);

    let cancelled = false;

    const onMapsAuthFailure = () => {
      if (cancelled) return;
      setMapsBillingBlocked(true);
      setLoadError(
        'Google Maps / Places : la facturation n’est pas activée sur votre projet Google Cloud, ou la clé API est refusée. Liez un compte de facturation (une carte bancaire est demandée ; un crédit gratuit peut s’appliquer).'
      );
      setGeoBusy(false);
      setGeoHint(null);
    };
    installGmAuthFailureHookOnce();
    mapsAuthFailureListeners.add(onMapsAuthFailure);

    (async () => {
      try {
        await ensureGoogleMaps(apiKey);
        if (cancelled || !mapRef.current || !inputRef.current) return;

        const g = window.google!.maps;
        const hasPin = value.lat != null && value.lng != null;
        const center = hasPin ? { lat: value.lat!, lng: value.lng! } : DEFAULT_CENTER;

        const map = new g.Map(mapRef.current, {
          center,
          zoom: hasPin ? 16 : 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;

        const marker = new g.Marker({
          map,
          position: center,
          draggable: true,
        });
        markerRef.current = marker;

        const geocoder = new g.Geocoder();

        const refreshDetailsAt = (lat: number, lng: number, fallbackFormatted?: string, fallbackPlaceId?: string | null) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (cancelled) return;
            if (status === 'OK' && results?.[0]) {
              applyGeocodeResult(lat, lng, results[0]);
            } else {
              setAddressDetails(null);
              onChangeRef.current({
                ...valueRef.current,
                lat,
                lng,
                formattedAddress: fallbackFormatted ?? valueRef.current.formattedAddress,
                googlePlaceId: fallbackPlaceId ?? valueRef.current.googlePlaceId,
                ...storedLocationPartsFromDetails(null),
              });
            }
          });
        };

        if (hasPin) {
          refreshDetailsAt(value.lat!, value.lng!);
        } else if (autoLocateIfEmpty && navigator.geolocation) {
          setGeoBusy(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              marker.setPosition({ lat, lng });
              map.setCenter({ lat, lng });
              map.setZoom(16);
              refreshDetailsAt(lat, lng);
              setGeoBusy(false);
              setGeoHint('Position détectée automatiquement. Ajustez le marqueur si besoin, puis enregistrez.');
            },
            () => {
              if (cancelled) return;
              setGeoBusy(false);
              setGeoHint(
                'Localisation automatique indisponible (permission refusée ou GPS). Utilisez la recherche ou « Utiliser ma position ».'
              );
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          );
        }

        const ac = new g.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
          types: ['establishment', 'geocode'],
        });

        ac.bindTo('bounds', map);

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          map.setCenter({ lat, lng });
          map.setZoom(16);
          marker.setPosition({ lat, lng });
          const comps = place.address_components as google.maps.GeocoderAddressComponent[] | undefined;
          const fromPlace = parseAddressDetailsFromComponents(comps);
          if (fromPlace) {
            setAddressDetails(fromPlace);
            onChangeRef.current({
              lat,
              lng,
              formattedAddress: place.formatted_address || '',
              googlePlaceId: place.place_id ?? null,
              ...storedLocationPartsFromDetails(fromPlace),
            });
          } else {
            refreshDetailsAt(lat, lng, place.formatted_address, place.place_id ?? null);
          }
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              applyGeocodeResult(lat, lng, results[0]);
            } else {
              setAddressDetails(null);
              onChangeRef.current({
                ...valueRef.current,
                lat,
                lng,
                formattedAddress: valueRef.current.formattedAddress,
                googlePlaceId: valueRef.current.googlePlaceId,
                ...storedLocationPartsFromDetails(null),
              });
            }
          });
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              applyGeocodeResult(lat, lng, results[0]);
            } else {
              setAddressDetails(null);
              onChangeRef.current({
                ...valueRef.current,
                lat,
                lng,
                formattedAddress: valueRef.current.formattedAddress,
                googlePlaceId: valueRef.current.googlePlaceId,
                ...storedLocationPartsFromDetails(null),
              });
            }
          });
        });

        if (!cancelled) setMapsReady(true);
      } catch (e: unknown) {
        if (!cancelled) {
          setMapsBillingBlocked(false);
          setLoadError(e instanceof Error ? e.message : 'Erreur carte');
        }
      }
    })();

    return () => {
      cancelled = true;
      setMapsReady(false);
      mapsAuthFailureListeners.delete(onMapsAuthFailure);
      mapInstanceRef.current = null;
      markerRef.current = null;
      if (mapRef.current) mapRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount; pin sync is separate
  }, [apiKey]);

  useEffect(() => {
    const marker = markerRef.current;
    const map = mapInstanceRef.current;
    if (!marker || !map) return;
    if (value.lat == null || value.lng == null) return;
    const pos = { lat: value.lat, lng: value.lng };
    marker.setPosition(pos);
    map.setCenter(pos);
    map.setZoom(16);
  }, [value.lat, value.lng]);

  const lastSyncedRef = useRef<string>('');
  useEffect(() => {
    if (value.lat == null || value.lng == null) {
      setAddressDetails(null);
      lastSyncedRef.current = '';
      return;
    }
    const key = `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`;
    if (key === lastSyncedRef.current) return;
    if (!mapsReady || !window.google?.maps) return;
    lastSyncedRef.current = key;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat: value.lat, lng: value.lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setAddressDetails(parseAddressDetailsFromComponents(results[0].address_components));
      } else {
        setAddressDetails(null);
      }
    });
  }, [value.lat, value.lng, mapsReady]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLoadError('La géolocalisation n’est pas disponible sur ce navigateur.');
      return;
    }
    setGeoBusy(true);
    setLoadError(null);
    void (async () => {
      try {
        const { lat, lng, accuracyM } = await acquireBestGeolocation({ timeoutMs: 22000 });
        const g = window.google?.maps;
        if (!g || !markerRef.current || !mapInstanceRef.current) {
          return;
        }
        const zoom = mapZoomForGpsAccuracy(accuracyM);
        markerRef.current.setPosition({ lat, lng });
        mapInstanceRef.current.setCenter({ lat, lng });
        mapInstanceRef.current.setZoom(zoom);
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(zoom);
          }
        });
        const geocoder = new g.Geocoder();
        await Promise.race([
          new Promise<void>((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                applyGeocodeResult(lat, lng, results[0]);
              } else {
                setAddressDetails(null);
                onChangeRef.current({
                  ...valueRef.current,
                  lat,
                  lng,
                  formattedAddress: valueRef.current.formattedAddress,
                  googlePlaceId: valueRef.current.googlePlaceId,
                  ...storedLocationPartsFromDetails(null),
                });
              }
              resolve();
            });
          }),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 12000);
          }),
        ]);
        if (accuracyM > 120) {
          setGeoHint(
            `Précision GPS typique ~${Math.round(accuracyM)} m. Le marqueur = moyenne de plusieurs lectures. L’adresse affichée peut décrire un lieu proche : placez le marqueur sur l’entrée réelle de l’atelier.`
          );
        } else {
          setGeoHint(
            'Le marqueur suit la moyenne GPS ; l’adresse texte est indicative. Déplacez le point sur l’entrée exacte si besoin.'
          );
        }
      } catch {
        setLoadError(
          'Impossible d’obtenir une position précise. Autorisez la localisation, activez le GPS ou réessayez à l’extérieur.'
        );
      } finally {
        setGeoBusy(false);
      }
    })();
  };

  if (!apiKey) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 ${className}`}>
        {loadError}
      </div>
    );
  }

  const loadErrorBlock = loadError ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">{loadError}</p>
      {mapsBillingBlocked ? (
        <>
          <p className="mt-2 text-red-800">
            Le message <code className="rounded bg-red-100 px-1">BillingNotEnabledMapError</code> dans la console vient de
            Google tant que la facturation n’est pas activée.
          </p>
          <a
            href={GOOGLE_CLOUD_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-semibold text-red-900 underline hover:text-red-950"
          >
            Activer la facturation (Google Cloud)
          </a>
          <p className="mt-3 text-red-800">
            <strong>Alternative sans Google :</strong> dans <code className="rounded bg-red-100 px-1">client/.env.local</code>{' '}
            ajoutez{' '}
            <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_WORKSHOP_MAP_PROVIDER=osm</code> puis redémarrez le serveur
            — carte OpenStreetMap (pas de clé ni de facturation Google).
          </p>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label htmlFor="workshop-map-search" className="mb-1 block text-sm font-medium text-gray-700">
          Rechercher une adresse sur la carte
        </label>
        <input
          ref={inputRef}
          id="workshop-map-search"
          type="text"
          autoComplete="off"
          placeholder="Ville, rue, établissement…"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoBusy || !!loadError}
          className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-50"
        >
          {geoBusy ? 'Localisation…' : 'Utiliser ma position'}
        </button>
      </div>

      {loadErrorBlock}
      {geoHint && !loadError && (
        <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-blue-900">{geoHint}</p>
      )}

      <div
        ref={mapRef}
        className={`h-[min(320px,50vh)] w-full overflow-hidden rounded-xl border-2 border-gray-200 shadow-inner ${loadError && mapsBillingBlocked ? 'hidden' : ''}`}
        role="presentation"
      />

      <p className="text-xs text-gray-500">
        Cliquez sur la carte ou déplacez le marqueur pour ajuster l’emplacement exact de l’atelier.
      </p>

      {value.lat != null && value.lng != null && (
        <WorkshopLocationDetailsPanel value={value} addressDetails={addressDetails} />
      )}
    </div>
  );
}
