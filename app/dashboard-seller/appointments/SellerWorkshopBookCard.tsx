'use client';

import Link from "next/link";

interface Workshop {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  adr: string;
  status: boolean;
  type?: string;
  certifie?: boolean;
  price_visit_mec?: number | null;
  price_visit_paint?: number | null;
  averageRating?: number;
  totalRatings?: number;
  locationLat?: number | null;
  locationLng?: number | null;
  locationRegion?: string | null;
}

interface Props {
  workshop: Workshop;
  onBook: (w: Workshop) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  distanceKm: number | null;
}

function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function getWorkshopTypeLabel(t: Props["t"], type?: string) {
  switch (type) {
    case "mechanic":
      return t("Mécanique");
    case "paint_vehicle":
      return t("Peinture véhicule");
    case "mechanic_paint_inspector":
      return t("Mécanique & Peinture");
    default:
      return type ?? t("Atelier");
  }
}

export default function SellerWorkshopBookCard({ workshop, onBook, t, distanceKm }: Props) {
  const hasMec = workshop.price_visit_mec != null && workshop.price_visit_mec > 0;
  const hasPaint = workshop.price_visit_paint != null && workshop.price_visit_paint > 0;
  const hasAnyPrice = hasMec || hasPaint;
  const dist = formatDistance(distanceKm);
  const workshopId = workshop._id || workshop.id;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/workshops/${workshopId}`}
            className="text-lg font-bold text-gray-900 font-[var(--font-poppins)] hover:text-teal-600 transition-colors truncate block"
          >
            {workshop.name}
          </Link>
          <span className="text-xs text-gray-500 mt-0.5 block">
            {getWorkshopTypeLabel(t, workshop.type)}
          </span>
        </div>
        {workshop.certifie && (
          <span className="ml-2 flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            {t("Certifié")}
          </span>
        )}
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="line-clamp-2">{workshop.adr}</span>
      </div>

      {/* Distance + Wilaya */}
      {(dist || workshop.locationRegion) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {dist && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {t("Distance approx.")} {dist}
            </span>
          )}
          {workshop.locationRegion && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
              {t("Wilaya")}: {workshop.locationRegion}
            </span>
          )}
        </div>
      )}

      {/* Rating */}
      {workshop.averageRating != null && workshop.averageRating > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-sm">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-4 h-4 ${s <= Math.round(workshop.averageRating!) ? "text-yellow-400" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-gray-600 font-medium">
            {workshop.averageRating.toFixed(1)}
          </span>
          {workshop.totalRatings != null && (
            <span className="text-gray-400 text-xs">({workshop.totalRatings})</span>
          )}
        </div>
      )}

      {/* Prices */}
      <div className="flex flex-wrap gap-2 mb-4">
        {hasMec && (
          <div className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg text-xs">
            <span className="text-gray-500">{t("Mécanique")}: </span>
            <span className="font-bold text-teal-700">{workshop.price_visit_mec!.toLocaleString()} DA</span>
          </div>
        )}
        {hasPaint && (
          <div className="px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg text-xs">
            <span className="text-gray-500">{t("Peinture")}: </span>
            <span className="font-bold text-orange-700">{workshop.price_visit_paint!.toLocaleString()} DA</span>
          </div>
        )}
        {!hasMec && !hasPaint && (
          <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 italic">
            {t("Prix non encore définis")}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={() => hasAnyPrice && onBook(workshop)}
          disabled={!hasAnyPrice}
          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
            hasAnyPrice
              ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t("Prendre RDV")}
        </button>
        {workshop.locationLat != null && workshop.locationLng != null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${workshop.locationLat},${workshop.locationLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold transition-all text-sm flex items-center justify-center shadow-md hover:shadow-lg"
            title={t("Itinéraire Google Maps")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        )}
        <Link
          href={`/workshops/${workshopId}`}
          className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all text-sm flex items-center justify-center"
          title={t("Voir détails")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
