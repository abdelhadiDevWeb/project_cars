'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map, Marker, LeafletMouseEvent } from 'leaflet';
import WorkshopLocationDetailsPanel from './WorkshopLocationDetailsPanel';
import {
  DEFAULT_CENTER,
  hasWorkshopAddressDetails,
  mapZoomForGpsAccuracy,
  storedLocationPartsFromDetails,
  type WorkshopLocationAddressDetails,
  type WorkshopLocationPickerProps,
} from './workshopLocationShared';
import { acquireBestGeolocation } from '@/utils/acquireGeolocation';

function parseNominatimAddress(addr: Record<string, string> | undefined): WorkshopLocationAddressDetails | null {
  if (!addr || typeof addr !== 'object') return null;
  const road = [addr.house_number, addr.road].filter(Boolean).join(' ').trim() || null;
  const locality =
    addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.city_district || null;
  const details: WorkshopLocationAddressDetails = {
    streetLine: road,
    neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || null,
    locality,
    administrativeAreaLevel1: addr.state || addr.region || null,
    administrativeAreaLevel2: addr.county || addr.district || null,
    postalCode: addr.postcode || null,
    country: addr.country || null,
  };
  return hasWorkshopAddressDetails(details) ? details : null;
}

async function reverseGeocode(lat: number, lng: number): Promise<{
  formattedAddress: string;
  details: WorkshopLocationAddressDetails | null;
}> {
  const res = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`);
  const json = (await res.json()) as { ok?: boolean; data?: { display_name?: string; address?: Record<string, string> } };
  if (!json.ok || !json.data) {
    return { formattedAddress: '', details: null };
  }
  const display = json.data.display_name || '';
  const details = parseNominatimAddress(json.data.address);
  return { formattedAddress: display, details };
}

export default function WorkshopLocationPickerOsm({
  value,
  onChange,
  className = '',
  autoLocateIfEmpty = false,
}: WorkshopLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [addressDetails, setAddressDetails] = useState<WorkshopLocationAddressDetails | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ lat: number; lon: number; label: string }[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLatLng = useCallback(async (lat: number, lng: number) => {
    setAddressDetails(null);
    try {
      const { formattedAddress, details } = await reverseGeocode(lat, lng);
      setAddressDetails(details);
      onChangeRef.current({
        lat,
        lng,
        formattedAddress,
        googlePlaceId: null,
        ...storedLocationPartsFromDetails(details),
      });
    } catch {
      onChangeRef.current({
        ...valueRef.current,
        lat,
        lng,
        formattedAddress: valueRef.current.formattedAddress,
        googlePlaceId: null,
        ...storedLocationPartsFromDetails(null),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const linkId = 'leaflet-css-workshop-osm';
        if (typeof document !== 'undefined' && !document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        const leaflet = await import('leaflet');
        const L = leaflet.default;
        if (cancelled || !mapRef.current) return;

        const icon = L.divIcon({
          className: 'workshop-osm-marker',
          html: '<div style="width:22px;height:22px;background:#0d9488;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const hasPin = value.lat != null && value.lng != null;
        const center: [number, number] = hasPin ? [value.lat!, value.lng!] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
        const zoom = hasPin ? 16 : 6;

        const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const marker = L.marker(center, { draggable: true, icon }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          void applyLatLng(ll.lat, ll.lng);
        });

        map.on('click', (e: LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          void applyLatLng(lat, lng);
        });

        if (hasPin) {
          void applyLatLng(value.lat!, value.lng!);
        } else if (autoLocateIfEmpty && navigator.geolocation) {
          setGeoBusy(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              marker.setLatLng([lat, lng]);
              map.setView([lat, lng], 16);
              void applyLatLng(lat, lng);
              setGeoBusy(false);
              setGeoHint('Position détectée automatiquement. Ajustez le marqueur si besoin, puis enregistrez.');
            },
            () => {
              if (cancelled) return;
              setGeoBusy(false);
              setGeoHint(
                'Localisation automatique indisponible. Utilisez la recherche ou « Utiliser ma position ».'
              );
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          );
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Impossible de charger la carte OpenStreetMap');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker || value.lat == null || value.lng == null) return;
    marker.setLatLng([value.lat, value.lng]);
    map.setView([value.lat, value.lng], 16);
  }, [value.lat, value.lng]);

  const lastSyncedRef = useRef('');
  useEffect(() => {
    if (value.lat == null || value.lng == null) {
      setAddressDetails(null);
      lastSyncedRef.current = '';
      return;
    }
    const key = `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`;
    if (key === lastSyncedRef.current) return;
    lastSyncedRef.current = key;
    void (async () => {
      const { details } = await reverseGeocode(value.lat!, value.lng!);
      setAddressDetails(details);
    })();
  }, [value.lat, value.lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLoadError('La géolocalisation n’est pas disponible sur ce navigateur.');
      return;
    }
    const marker = markerRef.current;
    const map = mapInstanceRef.current;
    if (!marker || !map) return;
    setGeoBusy(true);
    setLoadError(null);
    void (async () => {
      try {
        const { lat, lng, accuracyM } = await acquireBestGeolocation({ timeoutMs: 22000 });
        const zoom = mapZoomForGpsAccuracy(accuracyM);
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], zoom);
        requestAnimationFrame(() => {
          map.invalidateSize();
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], zoom);
        });
        await applyLatLng(lat, lng);
        setGeoHint(
          (accuracyM > 120
            ? `Précision GPS typique ~${Math.round(accuracyM)} m. `
            : '') +
            'Le marqueur utilise la moyenne de plusieurs lectures GPS. L’adresse affichée décrit la zone autour du point (OpenStreetMap / Google) — déplacez le marqueur sur l’entrée exacte de l’atelier si besoin.'
        );
      } catch {
        setLoadError('Impossible d’obtenir une position précise. Autorisez la localisation, activez le GPS ou réessayez à l’extérieur.');
      } finally {
        setGeoBusy(false);
      }
    })();
  };

  const runSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { lat: string; lon: string; display_name?: string }[];
      };
      if (!json.ok || !Array.isArray(json.data)) {
        setSearchResults([]);
        return;
      }
      setSearchResults(
        json.data.map((row) => ({
          lat: Number(row.lat),
          lon: Number(row.lon),
          label: row.display_name || `${row.lat},${row.lon}`,
        }))
      );
    } catch {
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void runSearch(searchQ);
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQ, runSearch]);

  const pickSearchResult = (lat: number, lon: number) => {
    const marker = markerRef.current;
    const map = mapInstanceRef.current;
    if (!marker || !map) return;
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 16);
    setSearchResults([]);
    setSearchQ('');
    void applyLatLng(lat, lon);
  };

  const loadErrorBlock = loadError ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">{loadError}</p>
    </div>
  ) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="rounded-lg border border-emerald-100 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900">
        Carte <strong>OpenStreetMap</strong> (aucune clé Google, pas de facturation Google). Géocodage via Nominatim
        (usage modéré).
      </p>

      <div className="relative">
        <label htmlFor="workshop-osm-search" className="mb-1 block text-sm font-medium text-gray-700">
          Rechercher un lieu
        </label>
        <input
          id="workshop-osm-search"
          type="text"
          autoComplete="off"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Ville, rue, établissement…"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
        {searchResults.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {searchResults.map((r, i) => (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-teal-50"
                  onClick={() => pickSearchResult(r.lat, r.lon)}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
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
        className="h-[min(320px,50vh)] w-full overflow-hidden rounded-xl border-2 border-gray-200 shadow-inner [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:font-sans"
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
