'use client';

import Link from "next/link";

export default function WorkshopDashboardPage() {
  const statsCards = [
    { title: 'Commandes en attente', value: '8', icon: 'pending', color: 'orange', change: '3 nouvelles' },
    { title: 'Vérifications ce mois', value: '45', icon: 'check', color: 'green', change: '+12%' },
    { title: 'Rendez-vous à venir', value: '12', icon: 'appointment', color: 'blue', change: '5 cette semaine' },
    { title: 'Taux de satisfaction', value: '98%', icon: 'rating', color: 'purple', change: '+2%' },
  ];

  const recentOrders = [
    { id: '#ORD-001', car: 'Golf 2020', client: 'Ahmed B.', date: 'Il y a 2 heures', status: 'En attente', priority: 'high' },
    { id: '#ORD-002', car: 'Tucson 2018', client: 'Fatima Z.', date: 'Il y a 5 heures', status: 'En cours', priority: 'medium' },
    { id: '#ORD-003', car: 'Clio 2018', client: 'Mohamed A.', date: 'Hier', status: 'Terminée', priority: 'low' },
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Tableau de bord</h1>
        <p className="text-gray-600">Bienvenue dans votre espace atelier</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsCards.map((stat, index) => {
          const colorClasses = {
            orange: {
              bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
              border: 'border-orange-200/50',
              text: 'text-orange-700',
              textBold: 'text-orange-900',
              textLight: 'text-orange-600',
              icon: 'bg-gradient-to-br from-orange-500 to-orange-600',
            },
            green: {
              bg: 'bg-gradient-to-br from-green-50 to-green-100',
              border: 'border-green-200/50',
              text: 'text-green-700',
              textBold: 'text-green-900',
              textLight: 'text-green-600',
              icon: 'bg-gradient-to-br from-green-500 to-green-600',
            },
            blue: {
              bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
              border: 'border-blue-200/50',
              text: 'text-blue-700',
              textBold: 'text-blue-900',
              textLight: 'text-blue-600',
              icon: 'bg-gradient-to-br from-blue-500 to-blue-600',
            },
            purple: {
              bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
              border: 'border-purple-200/50',
              text: 'text-purple-700',
              textBold: 'text-purple-900',
              textLight: 'text-purple-600',
              icon: 'bg-gradient-to-br from-purple-500 to-purple-600',
            },
          }[stat.color as keyof typeof colorClasses];
          
          return (
            <div key={index} className={`${colorClasses.bg} rounded-2xl shadow-lg p-6 border ${colorClasses.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${colorClasses.text} font-medium mb-2`}>{stat.title}</p>
                  <p className={`text-4xl font-bold ${colorClasses.textBold} font-[var(--font-poppins)]`}>{stat.value}</p>
                  <p className={`text-xs ${colorClasses.textLight} mt-2`}>{stat.change}</p>
                </div>
                <div className={`w-16 h-16 ${colorClasses.icon} rounded-2xl flex items-center justify-center shadow-lg`}>
                  {stat.icon === 'pending' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.icon === 'check' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.icon === 'appointment' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.icon === 'rating' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Link href="/dashboard-workshop/orders" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Commandes de vérification</h3>
              <p className="text-sm text-gray-600">Gérer les demandes de vérification</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard-workshop/appointments" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Rendez-vous</h3>
              <p className="text-sm text-gray-600">Voir et accepter les rendez-vous</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard-workshop/statistics" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Statistiques</h3>
              <p className="text-sm text-gray-600">Voir vos performances</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Commandes récentes</h2>
          <Link href="/dashboard-workshop/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir tout →
          </Link>
        </div>
        <div className="space-y-4">
          {recentOrders.map((order, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                order.status === 'En attente' ? 'bg-orange-100' :
                order.status === 'En cours' ? 'bg-blue-100' :
                'bg-green-100'
              }`}>
                {order.status === 'En attente' && (
                  <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                )}
                {order.status === 'En cours' && (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd" />
                  </svg>
                )}
                {order.status === 'Terminée' && (
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.id} - {order.car}</p>
                    <p className="text-sm text-gray-500">{order.client} • {order.date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'En attente' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
