'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useT } from "@/utils/i18n";
import dynamic from "next/dynamic";

interface Stats {
  pendingAppointments: number;
  totalAppointments: number;
  upcomingAppointments: number;
  appointmentsThisMonth: number;
  acceptedAppointments: number;
  refusedAppointments: number;
  completedAppointments: number;
  completionRate: number;
}

interface MonthlyStat {
  month: string;
  appointments: number;
  completed: number;
}

interface Facture {
  _id: string;
  id?: string;
  id_user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  service: 'mécanique' | 'vérification peinture' | 'mécanique & peinture';
  total: number;
  date: string;
  createdAt: string;
}

export default function WorkshopStatisticsPage() {
  const { user, token } = useUser();
  const t = useT();
  // Lazy-load Chart.js only on client; keep SVG fallback active if it fails
  const [chartsReady, setChartsReady] = useState(false);
  const [ChartComponents, setChartComponents] = useState<{
    Bar?: any;
    Doughnut?: any;
  }>({});
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState<Stats>({
    pendingAppointments: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    appointmentsThisMonth: 0,
    acceptedAppointments: 0,
    refusedAppointments: 0,
    completedAppointments: 0,
    completionRate: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueByService, setRevenueByService] = useState<Record<string, number>>({
    'mécanique': 0,
    'vérification peinture': 0,
    'mécanique & peinture': 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Load chart.js core first
        await import('chart.js/auto');
        // Then load react-chartjs-2 components dynamically
        const mod = await import('react-chartjs-2');
        if (mounted) {
          setChartComponents({ Bar: mod.Bar, Doughnut: mod.Doughnut });
          setChartsReady(true);
        }
      } catch (e) {
        // If not installed, we silently keep using the SVG fallback
        console.warn('Chart.js not available, using SVG fallback.', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        const res = await fetch('/api/workshop-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (res.ok && data.ok) {
          setStats(data.stats);
          setMonthlyStats(data.monthlyStats || []);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchFactures = async () => {
      if (!user || !token) return;
      try {
        const res = await fetch('/api/facture', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          await res.text();
          return;
        }
        const data = await res.json();
        if (res.ok && data.ok) {
          const list: Facture[] = data.factures || [];
          setFactures(list);
          const total = list.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
          setRevenueTotal(total);
          const bySvc: Record<string, number> = {
            'مécanique': 0 as unknown as number, // to ensure key exists even with typos
            'mécanique': 0,
            'vérification peinture': 0,
            'mécanique & peinture': 0,
          };
          for (const f of list) {
            const key = f.service || 'mécanique';
            bySvc[key] = (bySvc[key] || 0) + (Number(f.total) || 0);
          }
          setRevenueByService(bySvc);
        }
      } catch (e) {
        console.error('Error fetching factures:', e);
      }
    };

    if (user && token) {
      fetchStats();
      fetchFactures();
    }
  }, [user, token, timeRange]);

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">{t('Chargement...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">{t('Statistiques')}</h1>
          <p className="text-gray-600">{t("Analysez vos performances d'atelier")}</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'week' ? t('Semaine') : range === 'month' ? t('Mois') : t('Année')}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">{t('Rendez-vous total')}</p>
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{stats.totalAppointments.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-2">{t('{n} ce mois', { n: stats.appointmentsThisMonth })}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">{t('En attente')}</p>
            <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">{stats.pendingAppointments}</p>
          <p className="text-xs text-orange-600 mt-2">{t('{n} à venir', { n: stats.upcomingAppointments })}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">{t('Terminés')}</p>
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">{stats.completedAppointments.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">{t('Taux')}: {stats.completionRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-700 font-medium">{t('Acceptés')}</p>
            <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{stats.acceptedAppointments}</p>
          <p className="text-xs text-purple-600 mt-2">{t('{n} refusés', { n: stats.refusedAppointments })}</p>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 gap-6 mb-6">
        {/* Monthly Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 w-full">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">{t('Évolution mensuelle')}</h2>
          {monthlyStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>{t('Aucune donnée disponible')}</p>
            </div>
          ) : chartsReady && ChartComponents.Bar ? (
            <div className="space-y-4">
              <ChartComponents.Bar
                data={{
                  labels: monthlyStats.map(m => m.month),
                  datasets: [
                    {
                      label: t('Rendez-vous'),
                      data: monthlyStats.map(m => m.appointments),
                      backgroundColor: 'rgba(37, 99, 235, 0.5)',
                      borderColor: 'rgba(37, 99, 235, 1)',
                      borderWidth: 1,
                    },
                    {
                      label: t('Terminés'),
                      data: monthlyStats.map(m => m.completed),
                      backgroundColor: 'rgba(16, 185, 129, 0.5)',
                      borderColor: 'rgba(16, 185, 129, 1)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { precision: 0 },
                    },
                  },
                  plugins: {
                    legend: {
                      labels: { boxWidth: 12 },
                    },
                  },
                }}
                height={280}
              />
            </div>
          ) : (
            <>
              <div className="h-64 w-full flex items-end justify-between gap-2">
                {monthlyStats.map((data, index) => {
                  const maxValue = Math.max(...monthlyStats.map(d => Math.max(d.appointments, d.completed)));
                  const appointmentsHeight = maxValue > 0 ? (data.appointments / maxValue) * 100 : 0;
                  const completedHeight = maxValue > 0 ? (data.completed / maxValue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex flex-col items-center gap-1 justify-end" style={{ height: '100%' }}>
                        <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-md" style={{ height: `${appointmentsHeight}%` }}></div>
                        <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg shadow-md" style={{ height: `${completedHeight}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600 font-medium mt-2">{data.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-xs text-gray-600">{t('Rendez-vous')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-xs text-gray-600">{t('Terminés')}</span>
                </div>
              </div>
            </>
          )}
      </div>

      {/* Status Distribution (Donut) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">{t('Répartition par statut')}</h2>
        {stats.totalAppointments === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>{t('Aucune donnée disponible')}</p>
          </div>
          ) : chartsReady && ChartComponents.Doughnut ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-full lg:w-1/2">
                <ChartComponents.Doughnut
                  data={{
                    labels: [t('Terminés'), t('Acceptés'), t('Refusés'), t('En attente')],
                    datasets: [
                      {
                        label: t('Rendez-vous'),
                        data: [
                          stats.completedAppointments,
                          stats.acceptedAppointments,
                          stats.refusedAppointments,
                          stats.pendingAppointments,
                        ],
                        backgroundColor: ['#10b981', '#8b5cf6', '#ef4444', '#f59e0b'],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12 },
                      },
                    },
                  }}
                  height={240}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                  <span className="text-sm text-gray-700">
                    {t('Terminés')}: <span className="font-semibold">{stats.completedAppointments}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                  <span className="text-sm text-gray-700">
                    {t('Acceptés')}: <span className="font-semibold">{stats.acceptedAppointments}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>
                  <span className="text-sm text-gray-700">
                    {t('Refusés')}: <span className="font-semibold">{stats.refusedAppointments}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span className="text-sm text-gray-700">
                    {t('En attente')}: <span className="font-semibold">{stats.pendingAppointments}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <svg width="220" height="220" viewBox="0 0 42 42" className="flex-shrink-0">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" strokeWidth="6"></circle>
              {(() => {
                const total = Math.max(1, stats.totalAppointments);
                const segs = [
                  { value: stats.completedAppointments, color: '#10b981', label: t('Terminés') },
                  { value: stats.acceptedAppointments, color: '#8b5cf6', label: t('Acceptés') },
                  { value: stats.refusedAppointments, color: '#ef4444', label: t('Refusés') },
                  { value: stats.pendingAppointments, color: '#f59e0b', label: t('En attente') },
                ];
                let acc = 0;
                return segs
                  .filter(s => s.value > 0)
                  .map((s, idx) => {
                    const frac = s.value / total;
                    const dash = (frac * 100).toFixed(3);
                    const gap = 100 - parseFloat(dash);
                    const rot = (acc / total) * 360;
                    acc += s.value;
                    return (
                      <circle
                        key={idx}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={s.color}
                        strokeWidth="6"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset="25"
                        transform={`rotate(${rot} 21 21)`}
                      />
                    );
                  });
              })()}
              <circle cx="21" cy="21" r="10" fill="#ffffff"></circle>
              <text x="21" y="21" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800" fontSize="5" fontFamily="sans-serif">
                {stats.totalAppointments}
              </text>
            </svg>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                <span className="text-sm text-gray-700">
                  {t('Terminés')}: <span className="font-semibold">{stats.completedAppointments}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                <span className="text-sm text-gray-700">
                  {t('Acceptés')}: <span className="font-semibold">{stats.acceptedAppointments}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>
                <span className="text-sm text-gray-700">
                  {t('Refusés')}: <span className="font-semibold">{stats.refusedAppointments}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></span>
                <span className="text-sm text-gray-700">
                  {t('En attente')}: <span className="font-semibold">{stats.pendingAppointments}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Stats */}
        <div className="space-y-6 w-full">
        {/* Revenue Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 w-full">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">{t('Revenus')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-1">{t('Total factures')}</p>
              <p className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">
                {factures.length.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-1">{t('Revenu total')}</p>
              <p className="text-2xl font-bold text-green-700 font-[var(--font-poppins)]">
                {revenueTotal.toLocaleString()} {t('DA')}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-1">{t('Moyenne par facture')}</p>
              <p className="text-2xl font-bold text-blue-700 font-[var(--font-poppins)]">
                {factures.length > 0 ? Math.round(revenueTotal / factures.length).toLocaleString() : 0} {t('DA')}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">{t('Mécanique')}</p>
              <p className="text-xl font-semibold text-gray-900">{(revenueByService['mécanique'] || 0).toLocaleString()} {t('DA')}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">{t('Vérification Peinture')}</p>
              <p className="text-xl font-semibold text-gray-900">{(revenueByService['vérification peinture'] || 0).toLocaleString()} {t('DA')}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">{t('Mécanique & Peinture')}</p>
              <p className="text-xl font-semibold text-gray-900">{(revenueByService['mécanique & peinture'] || 0).toLocaleString()} {t('DA')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">{t('Rendez-vous ce mois')}</h3>
            <p className="text-3xl font-bold text-blue-600 font-[var(--font-poppins)]">{stats.appointmentsThisMonth}</p>
            <p className="text-sm text-gray-600 mt-2">{t('Nouveaux rendez-vous')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">{t('Taux de complétion')}</h3>
            <p className="text-3xl font-bold text-green-600 font-[var(--font-poppins)]">{stats.completionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">{t('Rendez-vous terminés / Total')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">{t('Rendez-vous à venir')}</h3>
            <p className="text-3xl font-bold text-orange-600 font-[var(--font-poppins)]">{stats.upcomingAppointments}</p>
            <p className="text-sm text-gray-600 mt-2">{t('Prochains rendez-vous')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
