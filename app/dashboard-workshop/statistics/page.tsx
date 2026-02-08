'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

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

export default function WorkshopStatisticsPage() {
  const { user, token } = useUser();
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

    if (user && token) {
      fetchStats();
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
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Statistiques</h1>
          <p className="text-gray-600">Analysez vos performances d&apos;atelier</p>
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
              {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Rendez-vous total</p>
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{stats.totalAppointments.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-2">{stats.appointmentsThisMonth} ce mois</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">En attente</p>
            <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">{stats.pendingAppointments}</p>
          <p className="text-xs text-orange-600 mt-2">{stats.upcomingAppointments} à venir</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Terminés</p>
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">{stats.completedAppointments.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">Taux: {stats.completionRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-700 font-medium">Acceptés</p>
            <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{stats.acceptedAppointments}</p>
          <p className="text-xs text-purple-600 mt-2">{stats.refusedAppointments} refusés</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Évolution mensuelle</h2>
          {monthlyStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Aucune donnée disponible</p>
            </div>
          ) : (
            <>
              <div className="h-64 flex items-end justify-between gap-2">
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
                  <span className="text-xs text-gray-600">Rendez-vous</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-xs text-gray-600">Terminés</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Additional Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Rendez-vous ce mois</h3>
            <p className="text-3xl font-bold text-blue-600 font-[var(--font-poppins)]">{stats.appointmentsThisMonth}</p>
            <p className="text-sm text-gray-600 mt-2">Nouveaux rendez-vous</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Taux de complétion</h3>
            <p className="text-3xl font-bold text-green-600 font-[var(--font-poppins)]">{stats.completionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Rendez-vous terminés / Total</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Rendez-vous à venir</h3>
            <p className="text-3xl font-bold text-orange-600 font-[var(--font-poppins)]">{stats.upcomingAppointments}</p>
            <p className="text-sm text-gray-600 mt-2">Prochains rendez-vous</p>
          </div>
        </div>
      </div>
    </div>
  );
}
