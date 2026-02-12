'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Statistics {
  overview: {
    totalUsers: number;
    totalWorkshops: number;
    totalCars: number;
    activeCars: number;
    certifiedCars: number;
    soldCars: number;
    activeUsers: number;
    activeWorkshops: number;
    totalAbonnements: number;
    activeAbonnements: number;
    userChange: number;
    carChange: number;
  };
  monthly: Array<{
    month: string;
    inspections: number;
    certified: number;
  }>;
  carsByStatus: Array<{
    status: string;
    count: number;
  }>;
  carsByBrand: Array<{
    brand: string;
    count: number;
  }>;
  recentUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    createdAt: string;
  }>;
  recentCars: Array<{
    id: string;
    brand: string;
    model: string;
    year: number;
    status: string;
    createdAt: string;
    owner: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
  }>;
  revenue: {
    thisMonth: number;
  };
}

export default function DashboardAdminPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setStatistics(data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-red-600">Erreur lors du chargement des statistiques</p>
      </div>
    );
  }

  // Chart data for monthly statistics
  const monthlyChartData = {
    labels: statistics.monthly.map(m => m.month),
    datasets: [
      {
        label: 'Inspections',
        data: statistics.monthly.map(m => m.inspections),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
      {
        label: 'Véhicules Certifiés',
        data: statistics.monthly.map(m => m.certified),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
      },
    ],
  };

  // Chart data for cars by status
  const statusChartData = {
    labels: statistics.carsByStatus.map(s => {
      const statusMap: { [key: string]: string } = {
        'no_proccess': 'Non traité',
        'en_attente': 'En attente',
        'actif': 'Actif',
        'sold': 'Vendu',
      };
      return statusMap[s.status] || s.status;
    }),
    datasets: [
      {
        data: statistics.carsByStatus.map(s => s.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(139, 92, 246, 0.6)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart data for top brands
  const brandsChartData = {
    labels: statistics.carsByBrand.slice(0, 10).map(b => b.brand),
    datasets: [
      {
        label: 'Nombre de véhicules',
        data: statistics.carsByBrand.slice(0, 10).map(b => b.count),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-2">Total Utilisateurs</p>
              <p className="text-4xl font-bold text-blue-900 font-[var(--font-poppins)]">
                {statistics.overview.totalUsers.toLocaleString('fr-FR')}
              </p>
              <p className={`text-xs mt-2 flex items-center gap-1 ${statistics.overview.userChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {statistics.overview.userChange >= 0 ? '+' : ''}{statistics.overview.userChange.toFixed(1)}% ce mois
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
              <p className="text-4xl font-bold text-green-900 font-[var(--font-poppins)]">
                {statistics.overview.certifiedCars.toLocaleString('fr-FR')}
              </p>
              <p className={`text-xs mt-2 flex items-center gap-1 ${statistics.overview.carChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {statistics.overview.carChange >= 0 ? '+' : ''}{statistics.overview.carChange.toFixed(1)}% ce mois
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
              <p className="text-sm text-purple-700 font-medium mb-2">Total Véhicules</p>
              <p className="text-4xl font-bold text-purple-900 font-[var(--font-poppins)]">
                {statistics.overview.totalCars.toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-purple-600 mt-2">
                {statistics.overview.activeCars} actifs
              </p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl shadow-lg p-6 border border-teal-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-700 font-medium mb-2">Abonnements Actifs</p>
              <p className="text-4xl font-bold text-teal-900 font-[var(--font-poppins)]">
                {statistics.overview.activeAbonnements.toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-teal-600 mt-2">
                {statistics.overview.totalAbonnements} au total
              </p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Statistics Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Statistiques Mensuelles</h3>
          <div className="h-64">
            <Bar data={monthlyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Cars by Status Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Véhicules par Statut</h3>
          <div className="h-64">
            <Doughnut data={statusChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Brands Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Top 10 Marques</h3>
        <div className="h-64">
          <Bar data={brandsChartData} options={chartOptions} />
        </div>
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
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Téléphone</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statistics.recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{user.phone}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Cars Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Véhicules Récents</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Modèle</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Marque</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Année</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Propriétaire</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statistics.recentCars.map((car) => (
                    <tr key={car.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">{car.model}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-medium">{car.brand}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{car.year}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {car.owner ? `${car.owner.firstName} ${car.owner.lastName}` : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          car.status === 'actif' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200'
                            : car.status === 'sold'
                            ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200'
                            : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {car.status === 'actif' ? 'Actif' : car.status === 'sold' ? 'Vendu' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Additional Stats */}
        <div className="space-y-6">
          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">
              {statistics.revenue.thisMonth.toLocaleString('fr-FR')} DA
            </p>
            <p className="text-sm text-blue-700 mt-2 font-medium">Revenus ce mois</p>
          </div>

          {/* Additional Stats Cards */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Statistiques Supplémentaires</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Ateliers Actifs</span>
                <span className="text-lg font-bold text-gray-900">{statistics.overview.activeWorkshops}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Véhicules Vendus</span>
                <span className="text-lg font-bold text-gray-900">{statistics.overview.soldCars}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Ateliers</span>
                <span className="text-lg font-bold text-gray-900">{statistics.overview.totalWorkshops}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
