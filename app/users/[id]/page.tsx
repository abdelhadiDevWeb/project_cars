'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getImageUrl } from "@/utils/backend";
import { useUser } from "@/contexts/UserContext";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: boolean;
  role?: string;
  certifie?: boolean;
}

interface UserImage {
  image: string;
}

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

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user: currentUser, token, userType } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch user data
        const userRes = await fetch(`/api/auth/user/${userId}`);
        
        if (!userRes.ok) {
          setError("Utilisateur non trouvé");
          setLoading(false);
          return;
        }

        const userData = await userRes.json();
        if (userData.ok && userData.user) {
          setUser(userData.user);
        }

        // Fetch profile image
        const imageRes = await fetch(`/api/user-image/${userId}`);
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          if (imageData.ok && imageData.userImage) {
            setProfileImage(imageData.userImage.image);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  // Fetch rates for this user
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoadingRates(true);
        const res = await fetch(`/api/rate/user/${userId}`);
        
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

    if (userId) {
      fetchRates();
    }
  }, [userId]);

  // Check if user can rate this seller
  useEffect(() => {
    const checkCanRate = async () => {
      if (!currentUser || !token || userType !== 'user' || userId === currentUser.id) {
        setCanRate(false);
        return;
      }

      try {
        const res = await fetch(`/api/rate/user/${userId}/can-rate`, {
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
      if (!currentUser || !token || userType !== 'user' || userId === currentUser.id) {
        return;
      }

      try {
        const res = await fetch(`/api/rate/user/${userId}/my-rate`, {
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

    if (userId && currentUser && token && userType === 'user') {
      checkCanRate();
      fetchUserRate();
    }
  }, [userId, currentUser, token, userType]);

  const handleSubmitRate = async () => {
    if (!ratingStar || ratingStar < 1 || ratingStar > 5) {
      alert('Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }

    if (!token) {
      alert('Vous devez être connecté pour noter');
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
          target: userId,
          targetType: 'User',
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
          const ratesRes = await fetch(`/api/rate/user/${userId}`);
          if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            if (ratesData.ok) {
              setRates(ratesData.rates || []);
              setAverageRating(ratesData.averageRating || 0);
              setTotalRatings(ratesData.totalRatings || 0);
            }
          }
          // Refresh user rate
          const userRateRes = await fetch(`/api/rate/user/${userId}/my-rate`, {
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

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Utilisateur non trouvé"}</p>
          <Link href="/" className="text-teal-600 hover:text-teal-700 font-semibold">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-teal-600 hover:text-teal-700 font-semibold mb-6 inline-block"
          >
            ← Retour
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
              {profileImage ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-teal-500 shadow-lg">
                  <Image
                    src={getImageUrl(profileImage) || '/images/default-avatar.png'}
                    alt={`${user.firstName} ${user.lastName}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-teal-500">
                  {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
                </div>
              )}
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)]">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.certifie && (
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md text-xs font-bold shadow-sm">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Certifié
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {user.status ? (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                      Compte vérifié
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                      Compte en attente
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-4">
                Informations de contact
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-700">{user.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{user.email}</span>
                </div>
              </div>
            </div>

            {/* Ratings Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
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
                    {userRate ? 'Modifier ma note' : 'Noter ce vendeur'}
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
                    <p className="text-sm text-gray-500 mt-2">Soyez le premier à noter ce vendeur !</p>
                  )}
                </div>
              )}
            </div>
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
                        {userRate ? 'Modifier votre note' : 'Noter ce vendeur'}
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
                        placeholder="Partagez votre expérience avec ce vendeur..."
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
        </div>
      </div>
    </div>
  );
}
