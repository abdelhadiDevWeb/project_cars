'use client';

import Link from "next/link";
import { useState } from "react";

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState('month');

  const stats = {
    totalViews: 1245,
    totalMessages: 89,
    totalAppointments: 34,
    totalSales: 8,
    conversionRate: 23.5,
    averagePrice: 2850000,
    totalRevenue: 22800000,
  };

  const monthlyData = [
    { month: 'Jan', views: 120, messages: 8, sales: 2 },
    { month: 'Fév', views: 180, messages: 12, sales: 3 },
    { month: 'Mar', views: 200, messages: 15, sales: 1 },
    { month: 'Avr', views: 150, messages: 10, sales: 2 },
    { month: 'Mai', views: 220, messages: 18, sales: 4 },
    { month: 'Juin', views: 375, messages: 26, sales: 3 },
  ];

  const topCars = [
    { name: 'Golf 2020', views: 245, messages: 12, status: 'Vendue' },
    { name: 'Tucson 2018', views: 189, messages: 8, status: 'Active' },
    { name: 'Clio 2018', views: 156, messages: 6, status: 'Vendue' },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700 font-medium">Vues Total</p>
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{stats.totalViews.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-2">+15% ce mois</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-700 font-medium">Messages</p>
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{stats.totalMessages}</p>
            <p className="text-xs text-purple-600 mt-2">+8% ce mois</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-700 font-medium">Ventes</p>
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">{stats.totalSales}</p>
            <p className="text-xs text-green-600 mt-2">Taux de conversion: {stats.conversionRate}%</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-orange-700 font-medium">Revenus Total</p>
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">{(stats.totalRevenue / 1000000).toFixed(1)}M DA</p>
            <p className="text-xs text-orange-600 mt-2">Prix moyen: {(stats.averagePrice / 1000000).toFixed(2)}M DA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Évolution mensuelle</h2>
            <div className="h-64 flex items-end justify-between gap-2">
              {monthlyData.map((data, index) => {
                const maxValue = Math.max(...monthlyData.map(d => d.views));
                const viewsHeight = (data.views / maxValue) * 100;
                const messagesHeight = (data.messages / maxValue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex flex-col items-center gap-1 justify-end" style={{ height: '100%' }}>
                      <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-md" style={{ height: `${viewsHeight}%` }}></div>
                      <div className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg shadow-md" style={{ height: `${messagesHeight}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium mt-2">{data.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-xs text-gray-600">Vues</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                <span className="text-xs text-gray-600">Messages</span>
              </div>
            </div>
          </div>

          {/* Top Cars */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Véhicules les plus consultés</h2>
            <div className="space-y-4">
              {topCars.map((car, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{car.name}</h3>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>{car.views} vues</span>
                      <span>{car.messages} messages</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    car.status === 'Vendue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {car.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Rendez-vous</h3>
            <p className="text-3xl font-bold text-teal-600 font-[var(--font-poppins)]">{stats.totalAppointments}</p>
            <p className="text-sm text-gray-600 mt-2">Total des rendez-vous</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Taux de conversion</h3>
            <p className="text-3xl font-bold text-green-600 font-[var(--font-poppins)]">{stats.conversionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Vues vers ventes</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Prix moyen</h3>
            <p className="text-3xl font-bold text-orange-600 font-[var(--font-poppins)]">{(stats.averagePrice / 1000000).toFixed(2)}M DA</p>
            <p className="text-sm text-gray-600 mt-2">Par véhicule vendu</p>
          </div>
        </div>
    </div>
  );
}
