'use client';

import Image from "next/image";
import Link from "next/link";

  const recentUsers = [
    { id: 70, name: 'Ahmed B.', role: 'Acheteur', phone: '06-405 995 20', registered: '02.00,3025', status: 'Actif' },
    { id: 50, name: 'Yacine C.', role: 'Vendeur', phone: '06-464 999 79', registered: '21.00,2025', status: 'Actif' },
    { id: 53, name: 'Assima B.', role: 'Atelier', phone: '06-645-643-66', registered: '31.02.3023', status: 'Actif' },
    { id: 54, name: 'Hocine Y.', role: 'Hyundai', phone: '05-329-385-53', registered: '01.02,3025', status: 'Actif' },
  ];

  const recentVehicles1 = [
    { id: 67, model: 'Golf 2020', brand: 'Volkswagen', status: 'Certifié' },
    { id: 16, model: 'Pajero 2017', brand: 'Mitsubishi', status: 'Certifié' },
    { id: 83, model: 'Clio 2018', brand: 'Renault', status: 'Certifié' },
  ];

  const recentVehicles2 = [
    { id: 46, model: 'Golf 2020', brand: 'Volkswagen', date: '27-Im 2025' },
    { id: 1, model: 'Pajero 2017', brand: 'Mitsubishi', date: '4-2 Jua 2025' },
    { id: 4, model: 'Clio 2018', brand: 'Hyundai', date: '3-2 Jeto 2025' },
  ];

  const recentActivities = [
    { name: 'Samm Auto', description: 'Comission Golf 2020', time: '10.99' },
    { name: 'Atelier Leclerc', description: 'Compission Golf 2018', time: '11/28' },
    { name: 'Kahina T.', description: 'Merci pour le contrôle détaillé du véhicule', time: '11/21' },
  ];

export default function DashboardAdminPage() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium mb-2">Total Utilisateurs</p>
                  <p className="text-4xl font-bold text-blue-900 font-[var(--font-poppins)]">12,580</p>
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    +12% ce mois
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 border border-green-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium mb-2">Véhicules Certifiés</p>
                  <p className="text-4xl font-bold text-green-900 font-[var(--font-poppins)]">8,102</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    +8% ce mois
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl shadow-lg p-6 border border-purple-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium mb-2">Inspections Ce Mois-ci</p>
                  <p className="text-4xl font-bold text-purple-900 font-[var(--font-poppins)]">682</p>
                  <p className="text-xs text-purple-600 mt-2">certifiés</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-200 flex flex-wrap items-center gap-4">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle Inspection
            </button>
            <div className="flex-1 min-w-[300px] relative">
              <input
                type="text"
                placeholder="Recherche de véhicule..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button className="p-3 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-gray-300">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button className="p-3 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-gray-300">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="px-5 py-3 text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-all border-2 border-blue-200 hover:border-blue-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter Un Compte
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Tables */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Users Table */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Utilisateurs Récents</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nom</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rôle</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Téléphone</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Inscr.</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-semibold text-gray-900">{user.id}</td>
                          <td className="px-5 py-4 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-semibold text-gray-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 font-medium">{user.role}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{user.phone}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{user.registered}</td>
                          <td className="px-5 py-4 text-sm">
                            <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                              {user.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Vehicles Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Véhicules Récents</h3>
                    <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">Toutes &gt;</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Modèle</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Marque</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentVehicles1.map((vehicle) => (
                          <tr key={vehicle.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-gray-900">{vehicle.id}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-gray-900">{vehicle.model}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 font-medium">{vehicle.brand}</td>
                            <td className="px-5 py-4 text-sm">
                              <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                {vehicle.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Véhicules Récents</h3>
                    <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">Toutes &gt;</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Modèle</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Marque</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentVehicles2.map((vehicle) => (
                          <tr key={vehicle.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-gray-900">{vehicle.id}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-gray-900">{vehicle.model}</td>
                            <td className="px-5 py-4 text-sm text-gray-600 font-medium">{vehicle.brand}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{vehicle.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Charts and Activities */}
            <div className="space-y-6">
              {/* Monthly Statistics Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Statistiques Mensuelles</h3>
                <div className="h-64 flex items-end justify-between gap-3">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
                    const height1 = Math.random() * 60 + 40;
                    const height2 = Math.random() * 60 + 40;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-md" style={{ height: `${height1}%` }}></div>
                          <div className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg shadow-md" style={{ height: `${height2}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-xs text-gray-600">Inspections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-xs text-gray-600">Véhicules Certifiés</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Activité Récente</h3>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">&gt;</Link>
                </div>
                <div className="space-y-4">
                  {recentActivities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-white font-bold text-sm">
                          {activity.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-1">{activity.name}</p>
                        <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">36 120 000 DA</p>
                  <p className="text-sm text-blue-700 mt-2 font-medium">Total encaissements</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl shadow-lg p-6 border border-teal-200/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-teal-900 font-[var(--font-poppins)]">3,266 DA</p>
                  <p className="text-sm text-teal-700 mt-2 font-medium">Commissions</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl shadow-lg p-6 border border-orange-200/50 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">2,280 000 DA</p>
                  <p className="text-sm text-orange-700 mt-2 font-medium">Service Inspection</p>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
