'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SponsorPlan {
  id: string;
  duration: number;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CarSponsor {
  id: string;
  id_car: string;
  car: {
    brand: string;
    model: string;
    year: number;
    status?: string;
  } | null;
  id_owner: string;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  } | null;
  start_date: string;
  end_date: string;
  duration: number;
  price: number;
  status: boolean;
  createdAt?: string;
}

export default function AdminSponsorPage() {
  const [sponsorPlans, setSponsorPlans] = useState<SponsorPlan[]>([]);
  const [sponsors, setSponsors] = useState<CarSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ duration: '', price: '' });
  const [planSubmitting, setPlanSubmitting] = useState(false);

  const fetchAll = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const [plansRes, sponsorsRes] = await Promise.all([
        fetch('/api/admin/sponsor-plans', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/sponsors?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        if (data.ok && Array.isArray(data.plans)) {
          setSponsorPlans(
            data.plans.map((p: SponsorPlan & { _id?: string }) => ({
              ...p,
              id: p.id || (p as any)._id?.toString?.() || '',
            }))
          );
        }
      }

      if (sponsorsRes.ok) {
        const data = await sponsorsRes.json();
        if (data.ok && Array.isArray(data.sponsors)) {
          setSponsors(data.sponsors);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  const openPlanCreate = () => {
    setEditingPlanId(null);
    setPlanForm({ duration: '', price: '' });
    setShowPlanModal(true);
  };

  const openPlanEdit = (plan: SponsorPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      duration: String(plan.duration),
      price: String(plan.price),
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseInt(planForm.duration, 10);
    const p = parseFloat(planForm.price);
    if (!Number.isFinite(d) || d < 1 || d > 365) {
      alert('Durée : entre 1 et 365 jours');
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      alert('Prix invalide');
      return;
    }
    const wasEdit = !!editingPlanId;
    setPlanSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body = JSON.stringify({ duration: d, price: p });
      const url = wasEdit
        ? `/api/admin/sponsor-plans/${editingPlanId}`
        : '/api/admin/sponsor-plans';
      const res = await fetch(url, {
        method: wasEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      const data = await res.json();
      if (data.ok) {
        setShowPlanModal(false);
        setEditingPlanId(null);
        setPlanForm({ duration: '', price: '' });
        await fetchAll(false);
        alert(wasEdit ? 'Plan mis à jour' : 'Plan créé');
      } else {
        alert(data.message || 'Erreur');
      }
    } catch {
      alert('Erreur réseau');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (
      !confirm(
        'Supprimer ce plan ? Il ne sera plus proposé pour de nouveaux sponsorings.'
      )
    ) {
      return;
    }
    setPlanSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/sponsor-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) await fetchAll(false);
      else alert(data.message || 'Erreur');
    } catch {
      alert('Erreur réseau');
    } finally {
      setPlanSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-amber-50/30 to-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-r-transparent" />
          <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-amber-50/20 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard-admin/abonnement"
              className="text-sm text-teal-600 hover:text-teal-800 font-medium mb-2 inline-block"
            >
              ← Abonnements plateforme
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
              Sponsoring & plans
            </h1>
            <p className="text-gray-600">
              Plans tarifaires (abonnement sponsor) et sponsorings actifs ou passés sur les annonces.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchAll(false)}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
          >
            Actualiser
          </button>
        </div>

        {/* Catalog: AbonnementSponsor */}
        <div className="mb-10">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                  Abonnement sponsor — catalogue ({sponsorPlans.length})
                </h2>
                <p className="text-white/90 text-sm mt-1">
                  Durée (jours) et prix en DA proposés lors de la création d&apos;un sponsoring.
                </p>
              </div>
              <button
                type="button"
                onClick={openPlanCreate}
                disabled={planSubmitting}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold border border-white/30 disabled:opacity-50"
              >
                + Nouveau plan
              </button>
            </div>
            <div className="p-6">
              {sponsorPlans.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  Aucun plan. Ajoutez-en pour que les vendeurs puissent sponsoriser leurs annonces.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-amber-50 text-left text-gray-700">
                        <th className="px-4 py-3 font-semibold">Durée (jours)</th>
                        <th className="px-4 py-3 font-semibold">Prix (DA)</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sponsorPlans.map((plan) => (
                        <tr
                          key={plan.id}
                          className="border-t border-gray-100 hover:bg-amber-50/40"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {plan.duration}
                          </td>
                          <td className="px-4 py-3">
                            {plan.price.toLocaleString('fr-FR')} DA
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openPlanEdit(plan)}
                              disabled={planSubmitting}
                              className="mr-2 px-3 py-1.5 rounded-lg bg-teal-100 text-teal-800 font-semibold hover:bg-teal-200 disabled:opacity-50"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={planSubmitting}
                              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 font-semibold hover:bg-red-200 disabled:opacity-50"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active sponsorships on cars */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                Sponsorings sur annonces ({sponsors.length})
              </h2>
              <p className="text-white/85 text-sm mt-1">
                Mise en avant payante par vendeur — voiture, dates et statut.
              </p>
            </div>
            <div className="p-6 overflow-x-auto">
              {sponsors.length === 0 ? (
                <p className="text-center text-gray-500 py-12">
                  Aucun sponsoring enregistré pour le moment.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="pb-3 pr-4 font-semibold">Véhicule</th>
                      <th className="pb-3 pr-4 font-semibold">Vendeur</th>
                      <th className="pb-3 pr-4 font-semibold">Période</th>
                      <th className="pb-3 pr-4 font-semibold">Durée</th>
                      <th className="pb-3 pr-4 font-semibold">Prix</th>
                      <th className="pb-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsors.map((s) => {
                      const activeWindow =
                        s.status &&
                        new Date(s.end_date).getTime() > now &&
                        new Date(s.start_date).getTime() <= now;
                      const expired =
                        new Date(s.end_date).getTime() <= now || !s.status;
                      return (
                        <tr key={s.id} className="border-b border-gray-100 align-top">
                          <td className="py-3 pr-4">
                            {s.car ? (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {s.car.brand} {s.car.model}
                                </span>
                                <span className="text-gray-500 ml-1">({s.car.year})</span>
                                {s.car.status && (
                                  <span className="ml-2 text-xs text-gray-400">
                                    · {s.car.status}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Voiture #{s.id_car}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {s.owner ? (
                              <>
                                <div className="font-medium text-gray-900">
                                  {s.owner.firstName} {s.owner.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{s.owner.email}</div>
                              </>
                            ) : (
                              <span className="text-gray-400">#{s.id_owner}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs text-gray-700 whitespace-nowrap">
                            {new Date(s.start_date).toLocaleDateString('fr-FR')} →{' '}
                            {new Date(s.end_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 pr-4">{s.duration} j</td>
                          <td className="py-3 pr-4">
                            {s.price.toLocaleString('fr-FR')} DA
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                                activeWindow
                                  ? 'bg-green-100 text-green-800'
                                  : expired
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {activeWindow
                                ? 'Actif'
                                : expired
                                ? 'Expiré / off'
                                : 'À venir'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {showPlanModal && (
          <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-amber-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-[var(--font-poppins)]">
                {editingPlanId ? 'Modifier le plan' : 'Nouveau plan sponsor'}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Durée 1–365 jours, prix en DA (API admin sponsor-plans).
              </p>
              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={planForm.duration}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, duration: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prix (DA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, price: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlanModal(false);
                      setEditingPlanId(null);
                      setPlanForm({ duration: '', price: '' });
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={planSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    {planSubmitting
                      ? '...'
                      : editingPlanId
                      ? 'Mettre à jour'
                      : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
