'use client';

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getImageUrl } from "@/utils/backend";
import { useT } from "@/utils/i18n";

interface SponsorableCar {
  id: string;
  _id: string;
  brand?: string;
  model?: string;
  year?: number;
  images?: string[];
  price?: number;
  status?: string;
  previous_sponsor_end_date: string | null;
  had_previous_sponsor: boolean;
}

interface SponsorPlan {
  id: string;
  duration: number;
  price: number;
}

interface Sponsor {
  id?: string;
  _id: string;
  id_car: string | (Partial<{ _id: string; brand: string; model: string; year: number; images: string[]; price: number; status: string }>);
  id_owner: string;
  start_date: string;
  end_date: string;
  duration: number;
  price: number;
  status: boolean;
  createdAt?: string;
}

function isSponsorActive(s: Sponsor, now: number): boolean {
  return s.status === true && new Date(s.end_date).getTime() > now;
}

function formatCountdown(endDate: string, now: number): string {
  const diff = new Date(endDate).getTime() - now;
  if (diff <= 0) return 'Expiré';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}min`);
  return parts.join(' ');
}

function getSponsorCarInfo(s: Sponsor): { brand: string; model: string; year: number; image: string | null } {
  if (typeof s.id_car === 'object' && s.id_car) {
    const car = s.id_car as any;
    return {
      brand: car.brand || '—',
      model: car.model || '',
      year: car.year || 0,
      image: car.images?.[0] ? getImageUrl(car.images[0]) : null,
    };
  }
  return { brand: '—', model: '', year: 0, image: null };
}

export default function SponsorSection() {
  const t = useT();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Create-sponsor modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sponsorableCars, setSponsorableCars] = useState<SponsorableCar[]>([]);
  const [sponsorPlans, setSponsorPlans] = useState<SponsorPlan[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCar, setPaymentCar] = useState<SponsorableCar | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<SponsorPlan | null>(null);
  const [payingNow, setPayingNow] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Tick every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch sponsors on mount
  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      setLoadingSponsors(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sponsor/my-sponsors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.sponsors)) {
        setSponsors(data.sponsors);
      }
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    } finally {
      setLoadingSponsors(false);
    }
  };

  const openCreateModal = useCallback(async () => {
    setSelectedCarId('');
    setSelectedPlanId('');
    setCreateError('');
    setShowCreateModal(true);
    setLoadingCars(true);
    setLoadingPlans(true);

    const token = localStorage.getItem('token');
    try {
      const [carsRes, plansRes] = await Promise.all([
        fetch('/api/sponsor/sponsorable-cars', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/sponsor/plans'),
      ]);
      const carsData = await carsRes.json().catch(() => null);
      const plansData = await plansRes.json().catch(() => null);

      setSponsorableCars(carsRes.ok && carsData?.ok ? carsData.cars : []);
      setSponsorPlans(plansRes.ok && plansData?.ok ? plansData.plans : []);
    } catch {
      setSponsorableCars([]);
      setSponsorPlans([]);
    } finally {
      setLoadingCars(false);
      setLoadingPlans(false);
    }
  }, []);

  const submitCreate = useCallback(async () => {
    if (!selectedCarId || !selectedPlanId) return;
    setCreating(true);
    setCreateError('');

    const car = sponsorableCars.find((c) => c.id === selectedCarId) || null;
    const plan = sponsorPlans.find((p) => p.id === selectedPlanId) || null;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sponsor/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_car: selectedCarId, id_abonnement: selectedPlanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCreateError(data?.message || t('Erreur lors de la création du sponsor'));
        setCreating(false);
        return;
      }

      setShowCreateModal(false);
      setCreating(false);
      setPaymentCar(car);
      setPaymentPlan(plan);
      setPaymentDone(false);
      setPayingNow(false);
      setShowPaymentModal(true);
      fetchSponsors();
    } catch {
      setCreateError(t('Erreur de connexion'));
      setCreating(false);
    }
  }, [selectedCarId, selectedPlanId, sponsorableCars, sponsorPlans, t]);

  const handlePayNow = () => {
    setPayingNow(true);
    setTimeout(() => {
      setPayingNow(false);
      setPaymentDone(true);
    }, 1500);
  };

  const activeSponsors = useMemo(() => sponsors.filter((s) => isSponsorActive(s, now)), [sponsors, now]);
  const inactiveSponsors = useMemo(() => sponsors.filter((s) => !isSponsorActive(s, now)), [sponsors, now]);

  return (
    <div>
      {/* Create button */}
      <button
        onClick={openCreateModal}
        className="mb-6 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t('Créer un sponsor')}
      </button>

      {loadingSponsors ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-12 w-12 text-purple-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-600">{t('Chargement...')}</p>
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-purple-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-gray-600 mb-2 font-semibold">{t('Aucun sponsor')}</p>
          <p className="text-sm text-gray-500">{t('Sponsorisez une voiture pour la mettre en avant')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active sponsors */}
          {activeSponsors.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                {t('Sponsors actifs')} ({activeSponsors.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeSponsors.map((s) => (
                  <SponsorCard key={s._id || s.id} sponsor={s} now={now} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive sponsors */}
          {inactiveSponsors.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                {t('Sponsors expirés / annulés')} ({inactiveSponsors.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {inactiveSponsors.map((s) => (
                  <SponsorCard key={s._id || s.id} sponsor={s} now={now} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Create Sponsor Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">{t('Créer un sponsor')}</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/20 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{createError}</div>
              )}

              {/* Step 1 — Pick a car */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('Choisir une voiture')}</h3>
                {loadingCars ? (
                  <div className="flex justify-center py-6"><svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
                ) : sponsorableCars.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500 text-sm">{t('Aucune voiture éligible')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('Vos voitures actives qui n\'ont pas de sponsor actif apparaîtront ici')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sponsorableCars.map((car) => {
                      const selected = selectedCarId === car.id;
                      const img = car.images?.[0] ? getImageUrl(car.images[0]) : null;
                      return (
                        <button
                          key={car.id}
                          onClick={() => setSelectedCarId(car.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            selected
                              ? 'border-purple-500 bg-purple-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                          }`}
                        >
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            {img ? (
                              <Image src={img} alt={`${car.brand} ${car.model}`} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{car.brand} {car.model} {car.year}</p>
                            {car.had_previous_sponsor && car.previous_sponsor_end_date ? (
                              <p className="text-xs text-purple-600">{t('Précédent sponsor terminé le')} {new Date(car.previous_sponsor_end_date).toLocaleDateString('fr-FR')}</p>
                            ) : (
                              <p className="text-xs text-gray-400">{t('Jamais sponsorisé')}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                            {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2 — Pick a plan */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('Choisir un plan')}</h3>
                {loadingPlans ? (
                  <div className="flex justify-center py-6"><svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
                ) : sponsorPlans.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500 text-sm">{t('Aucun plan disponible')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sponsorPlans.map((plan) => {
                      const selected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-center ${
                            selected
                              ? 'border-purple-500 bg-purple-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                          }`}
                        >
                          <p className="text-2xl font-bold text-purple-700">{plan.duration}</p>
                          <p className="text-xs text-gray-500 mb-2">{t('jours')}</p>
                          <p className="text-sm font-bold text-gray-900">{plan.price.toLocaleString()} DA</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
              >
                {t('Annuler')}
              </button>
              <button
                onClick={submitCreate}
                disabled={!selectedCarId || !selectedPlanId || creating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    {t('Création...')}
                  </>
                ) : (
                  t('Confirmer')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Modal ─── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
            {!paymentDone ? (
              <>
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Paiement du sponsor')}</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    {paymentCar ? `${paymentCar.brand} ${paymentCar.model}` : '—'}
                  </p>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-left mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('Durée')}</span>
                      <span className="font-semibold text-gray-900">{paymentPlan?.duration} {t('jours')}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                      <span className="text-gray-500">{t('Total à payer')}</span>
                      <span className="font-bold text-purple-700 text-lg">{paymentPlan?.price.toLocaleString()} DA</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-6 italic">
                    {t('Le paiement est simulé pour le moment. Votre sponsor est déjà créé.')}
                  </p>

                  <button
                    onClick={handlePayNow}
                    disabled={payingNow}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {payingNow ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        {t('Traitement...')}
                      </>
                    ) : (
                      t('Payer maintenant')
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('Paiement réussi')}</h2>
                <p className="text-sm text-gray-500 mb-6">{t('Votre sponsor est maintenant actif. Merci !')}</p>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  {t('Fermer')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sponsor Card ─── */
function SponsorCard({ sponsor, now, t }: { sponsor: Sponsor; now: number; t: (key: string) => string }) {
  const active = isSponsorActive(sponsor, now);
  const info = getSponsorCarInfo(sponsor);
  const cancelled = !sponsor.status;
  const expired = sponsor.status && new Date(sponsor.end_date).getTime() <= now;

  return (
    <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden transition-all hover:shadow-xl ${active ? 'border-purple-200' : 'border-gray-200'}`}>
      {/* Car image */}
      <div className="relative h-40 bg-gray-100">
        {info.image ? (
          <Image src={info.image} alt={`${info.brand} ${info.model}`} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          {active ? (
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {t('Actif')}
            </span>
          ) : cancelled ? (
            <span className="px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">{t('Annulé')}</span>
          ) : (
            <span className="px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">{t('Expiré')}</span>
          )}
        </div>

        {/* Year pill */}
        {info.year > 0 && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-black/50 text-white text-xs font-bold rounded-full">{info.year}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h4 className="font-bold text-gray-900">{info.brand} {info.model}</h4>

        {/* Info rows */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('Début')}</span>
            <span className="font-medium text-gray-900">{new Date(sponsor.start_date).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('Fin')}</span>
            <span className="font-medium text-gray-900">{new Date(sponsor.end_date).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('Durée')}</span>
            <span className="font-medium text-gray-900">{sponsor.duration} {t('jours')}</span>
          </div>
          {sponsor.price > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('Prix')}</span>
              <span className="font-bold text-purple-700">{sponsor.price.toLocaleString()} DA</span>
            </div>
          )}
        </div>

        {/* Countdown / status */}
        {active ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-600 font-medium">{t('Temps restant')}</p>
            <p className="text-lg font-bold text-purple-700">{formatCountdown(sponsor.end_date, now)}</p>
          </div>
        ) : expired ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold text-gray-500">{t('Expiré')}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold text-gray-500">{t('Annulé')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
