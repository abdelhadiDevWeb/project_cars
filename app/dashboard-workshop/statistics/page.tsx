'use client';

import { useState } from "react";

export default function WorkshopStatisticsPage() {
  const [timeRange, setTimeRange] = useState('month');

  const stats = {
    totalVerifications: 1245,
    pendingOrders: 8,
    completedOrders: 1237,
    totalAppointments: 89,
    averageRating: 4.8,
    totalRevenue: 12450000,
  };

  const monthlyData = [
    { month: 'Jan', verifications: 95, appointments: 12, completed: 88 },
    { month: 'Fév', verifications: 120, appointments: 15, completed: 110 },
    { month: 'Mar', verifications: 135, appointments: 18, completed: 125 },
    { month: 'Avr', verifications: 110, appointments: 14, completed: 102 },
    { month: 'Mai', verifications: 145, appointments: 20, completed: 138 },
    { month: 'Juin', verifications: 180, appointments: 25, completed: 172 },
  ];

  const topServices = [
    { name: 'Vérification complète', count: 456, revenue: 4560000 },
    { name: 'Inspection mécanique', count: 312, revenue: 2340000 },
    { name: 'Vérification carrosserie', count: 289, revenue: 1734000 },
    { name: 'Contrôle technique', count: 188, revenue: 1504000 },
  ];

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
            <p className="text-sm text-blue-700 font-medium">Vérifications totales</p>
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{stats.totalVerifications.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-2">+12% ce mois</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Commandes en attente</p>
            <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">{stats.pendingOrders}</p>
          <p className="text-xs text-orange-600 mt-2">3 nouvelles aujourd&apos;hui</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Vérifications terminées</p>
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">{stats.completedOrders.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">Taux de complétion: 99.4%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-700 font-medium">Note moyenne</p>
            <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{stats.averageRating}/5</p>
          <p className="text-xs text-purple-600 mt-2">Basé sur 456 avis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Évolution mensuelle</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyData.map((data, index) => {
              const maxValue = Math.max(...monthlyData.map(d => d.verifications));
              const verificationsHeight = (data.verifications / maxValue) * 100;
              const completedHeight = (data.completed / maxValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex flex-col items-center gap-1 justify-end" style={{ height: '100%' }}>
                    <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-md" style={{ height: `${verificationsHeight}%` }}></div>
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
              <span className="text-xs text-gray-600">Vérifications</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-xs text-gray-600">Terminées</span>
            </div>
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Services les plus demandés</h2>
          <div className="space-y-4">
            {topServices.map((service, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>{service.count} vérifications</span>
                    <span className="font-medium text-green-600">{(service.revenue / 1000000).toFixed(1)}M DA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Rendez-vous</h3>
          <p className="text-3xl font-bold text-blue-600 font-[var(--font-poppins)]">{stats.totalAppointments}</p>
          <p className="text-sm text-gray-600 mt-2">Total des rendez-vous</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Revenus totaux</h3>
          <p className="text-3xl font-bold text-green-600 font-[var(--font-poppins)]">{(stats.totalRevenue / 1000000).toFixed(1)}M DA</p>
          <p className="text-sm text-gray-600 mt-2">Ce mois</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Taux de satisfaction</h3>
          <p className="text-3xl font-bold text-purple-600 font-[var(--font-poppins)]">98%</p>
          <p className="text-sm text-gray-600 mt-2">Clients satisfaits</p>
        </div>
      </div>
    </div>
  );
}
