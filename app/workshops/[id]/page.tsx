'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

interface Workshop {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  adr: string;
  status: boolean;
  verfie?: boolean;
  certifie?: boolean;
  type?: string; // 'mechanic', 'paint_vehicle', or 'mechanic_paint_inspector'
  price_visit_mec?: number | null;
  price_visit_paint?: number | null;
}

const getWorkshopTypeLabel = (type?: string) => {
  switch (type) {
    case 'mechanic':
      return 'Mécanicien';
    case 'paint_vehicle':
      return 'Peinture véhicule';
    case 'mechanic_paint_inspector':
      return 'Mécanicien & Peinture Inspecteur';
    default:
      return type || 'Atelier';
  }
};

interface Rate {
  _id: string;
  id?: string;
  id_rater: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  message: string | null;
  star: number;
  createdAt: string;
}

export default function WorkshopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.id as string;
  const { user, token, userType } = useUser();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rates, setRates] = useState<Rate[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loadingRates, setLoadingRates] = useState(true);
  const [canRate, setCanRate] = useState(false);
  const [userRate, setUserRate] = useState<Rate | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingStar, setRatingStar] = useState(0);
  const [ratingMessage, setRatingMessage] = useState('');
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  useEffect(() => {
    const fetchWorkshop = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch workshop data
        const workshopRes = await fetch(`/api/workshop/${workshopId}`);
        
        if (!workshopRes.ok) {
          setError("Atelier non trouvé");
          setLoading(false);
          return;
        }

        const workshopData = await workshopRes.json();
        if (workshopData.ok && workshopData.workshop) {
          setWorkshop(workshopData.workshop);
        }
      } catch (error) {
        console.error('Error fetching workshop:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (workshopId) {
      fetchWorkshop();
    }
  }, [workshopId]);

  // Fetch rates for this workshop
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoadingRates(true);
        const res = await fetch(`/api/rate/workshop/${workshopId}`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setRates(data.rates || []);
            setAverageRating(data.averageRating || 0);
            setTotalRatings(data.totalRatings || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setLoadingRates(false);
      }
    };

    if (workshopId) {
      fetchRates();
    }
  }, [workshopId]);

  // Check if user can rate this workshop
  useEffect(() => {
    const checkCanRate = async () => {
      if (!user || !token || userType !== 'user') {
        setCanRate(false);
        return;
      }

      try {
        const res = await fetch(`/api/rate/workshop/${workshopId}/can-rate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setCanRate(data.canRate || false);
          }
        }
      } catch (error) {
        console.error('Error checking if can rate:', error);
      }
    };

    // Fetch user's existing rate
    const fetchUserRate = async () => {
      if (!user || !token || userType !== 'user') {
        return;
      }

      try {
        const res = await fetch(`/api/rate/workshop/${workshopId}/my-rate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.rate) {
            setUserRate(data.rate);
            setRatingStar(data.rate.star);
            setRatingMessage(data.rate.message || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user rate:', error);
      }
    };

    if (workshopId && user && token && userType === 'user') {
      checkCanRate();
      fetchUserRate();
    }
  }, [workshopId, user, token, userType]);

  const handleSubmitRate = async () => {
    if (!ratingStar || ratingStar < 1 || ratingStar > 5) {
      alert('Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }

    try {
      setIsSubmittingRate(true);
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: workshopId,
          targetType: 'Workshop',
          star: ratingStar,
          message: ratingMessage.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          alert(userRate ? 'Note mise à jour avec succès' : 'Note ajoutée avec succès');
          setShowRateModal(false);
          // Refresh rates
          const ratesRes = await fetch(`/api/rate/workshop/${workshopId}`);
          if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            if (ratesData.ok) {
              setRates(ratesData.rates || []);
              setAverageRating(ratesData.averageRating || 0);
              setTotalRatings(ratesData.totalRatings || 0);
            }
          }
          // Refresh user rate
          const userRateRes = await fetch(`/api/rate/workshop/${workshopId}/my-rate`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (userRateRes.ok) {
            const userRateData = await userRateRes.json();
            if (userRateData.ok && userRateData.rate) {
              setUserRate(userRateData.rate);
            }
          }
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Erreur lors de l\'envoi de la note');
      }
    } catch (error) {
      console.error('Error submitting rate:', error);
      alert('Erreur lors de l\'envoi de la note');
    } finally {
      setIsSubmittingRate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Atelier non trouvé"}</p>
          <Link href="/" className="text-teal-600 hover:text-teal-700 font-semibold">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-8 border-2 border-gray-200/50">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl">
                  {workshop.name.substring(0, 2).toUpperCase()}
                </div>
                {workshop.certifie && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)]">
                    {workshop.name}
                  </h1>
                  {workshop.certifie && (
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md text-xs font-bold shadow-sm">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Certifié
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{workshop.email}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {workshop.status ? (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                      Atelier actif
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                      Atelier en attente
                    </span>
                  )}
                  {workshop.type && (
                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                      {getWorkshopTypeLabel(workshop.type)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-2 border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Informations de contact</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <a href={`tel:${workshop.phone}`} className="text-gray-900 font-semibold hover:text-teal-600 transition-colors">
                      {workshop.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a href={`mailto:${workshop.email}`} className="text-gray-900 font-semibold hover:text-teal-600 transition-colors">
                      {workshop.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="text-gray-900 font-semibold">{workshop.adr}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-2 border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Tarifs de visite</h2>
              <div className="space-y-4">
                {workshop.price_visit_mec && workshop.price_visit_mec > 0 && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Prix de visite mécanique</p>
                    <p className="text-2xl font-bold text-blue-600">{workshop.price_visit_mec.toLocaleString()} DA</p>
                  </div>
                )}
                {workshop.price_visit_paint && workshop.price_visit_paint > 0 && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Prix de visite peinture</p>
                    <p className="text-2xl font-bold text-purple-600">{workshop.price_visit_paint.toLocaleString()} DA</p>
                  </div>
                )}
                {(!workshop.price_visit_mec || workshop.price_visit_mec <= 0) && (!workshop.price_visit_paint || workshop.price_visit_paint <= 0) && (
                  <p className="text-gray-500 text-center py-4">Aucun tarif disponible</p>
                )}
              </div>
            </div>
          </div>

          {/* Ratings Section */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-2 border-gray-200/50 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Avis et notes</h2>
              {canRate && (
                <button
                  onClick={() => {
                    if (userRate) {
                      setRatingStar(userRate.star);
                      setRatingMessage(userRate.message || '');
                    } else {
                      setRatingStar(0);
                      setRatingMessage('');
                    }
                    setShowRateModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {userRate ? 'Modifier ma note' : 'Noter cet atelier'}
                </button>
              )}
            </div>

            {/* Average Rating */}
            {loadingRates ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : totalRatings > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{totalRatings} avis</div>
                  </div>
                </div>

                {/* Ratings List */}
                <div className="space-y-4">
                  {rates.map((rate) => (
                    <div key={rate._id || rate.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {rate.id_rater?.firstName} {rate.id_rater?.lastName}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= rate.star ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(rate.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {rate.message && (
                        <p className="text-sm text-gray-700 mt-2">{rate.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-gray-600">Aucun avis pour le moment</p>
                {canRate && (
                  <p className="text-sm text-gray-500 mt-2">Soyez le premier à noter cet atelier !</p>
                )}
              </div>
            )}
          </div>

          {/* Rate Modal */}
          {showRateModal && (
            <>
              <div
                className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
                onClick={() => setShowRateModal(false)}
              ></div>
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white font-[var(--font-poppins)]">
                        {userRate ? 'Modifier votre note' : 'Noter cet atelier'}
                      </h2>
                      <button
                        onClick={() => setShowRateModal(false)}
                        className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Votre note (1-5 étoiles)
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingStar(star)}
                            className={`w-12 h-12 transition-all ${
                              star <= ratingStar
                                ? 'text-yellow-400 scale-110'
                                : 'text-gray-300 hover:text-yellow-300'
                            }`}
                          >
                            <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Votre avis (optionnel)
                      </label>
                      <textarea
                        value={ratingMessage}
                        onChange={(e) => setRatingMessage(e.target.value)}
                        placeholder="Partagez votre expérience avec cet atelier..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">{ratingMessage.length}/500 caractères</p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmitRate}
                        disabled={isSubmittingRate || ratingStar === 0}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingRate ? 'Envoi...' : userRate ? 'Mettre à jour' : 'Envoyer'}
                      </button>
                      <button
                        onClick={() => setShowRateModal(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Back Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
