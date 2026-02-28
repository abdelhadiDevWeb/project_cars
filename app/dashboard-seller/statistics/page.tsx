'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

interface Stats {
  activeCars: number;
  totalCars: number;
  soldCars: number;
  unreadNotifications: number;
  totalNotifications: number;
  totalAppointments: number;
  upcomingAppointments: number;
  averagePrice: number;
  conversionRate: number;
}

interface TopCar {
  _id: string;
  id?: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  name: string;
}

export default function StatisticsPage() {
  const { user, token } = useUser();
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState<Stats>({
    activeCars: 0,
    totalCars: 0,
    soldCars: 0,
    unreadNotifications: 0,
    totalNotifications: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    averagePrice: 0,
    conversionRate: 0,
  });
  const [topCars, setTopCars] = useState<TopCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        const res = await fetch('/api/seller-stats', {
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
          setTopCars(data.topCars || []);
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
      <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100 flex items-center justify-center min-h-screen">
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

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'actif': 'Active',
      'sold': 'Vendue',
      'en_attente': 'En attente',
      'no_proccess': 'Non traité',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'sold') return 'bg-green-100 text-green-700';
    if (status === 'actif') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Statistiques</h1>
          <p className="text-gray-600">Analysez vos performances de vente</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                timeRange === range
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>

        {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50">
            <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Véhicules Actifs</p>
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
            </div>
          <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{stats.activeCars}</p>
          <p className="text-xs text-blue-600 mt-2">{stats.totalCars} au total</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-700 font-medium">Messages</p>
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
          <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{stats.unreadNotifications}</p>
          <p className="text-xs text-purple-600 mt-2">{stats.totalNotifications} messages au total</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-700 font-medium">Ventes</p>
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">{stats.soldCars}</p>
            <p className="text-xs text-green-600 mt-2">Taux de conversion: {stats.conversionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cars */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Vos véhicules</h2>
          {topCars.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              <p>Aucun véhicule trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topCars.map((car, index) => (
                <div key={car._id || car.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{car.name}</h3>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>Année: {car.year}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(car.status)}`}>
                    {getStatusLabel(car.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Rendez-vous</h3>
            <p className="text-3xl font-bold text-teal-600 font-[var(--font-poppins)]">{stats.totalAppointments}</p>
            <p className="text-sm text-gray-600 mt-2">Total des rendez-vous</p>
            <p className="text-xs text-teal-600 mt-1">{stats.upcomingAppointments} à venir</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Taux de conversion</h3>
            <p className="text-3xl font-bold text-green-600 font-[var(--font-poppins)]">{stats.conversionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Véhicules vendus / Total</p>
          </div>

          {stats.averagePrice > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Prix moyen</h3>
              <p className="text-3xl font-bold text-orange-600 font-[var(--font-poppins)]">
                {(stats.averagePrice / 1000000).toFixed(2)}M DA
              </p>
            <p className="text-sm text-gray-600 mt-2">Par véhicule vendu</p>
            </div>
          )}
          </div>
        </div>
    </div>
  );
}
