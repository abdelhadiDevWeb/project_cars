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

interface FinanceData {
  overview: {
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    thisYearRevenue: number;
    growth: number;
    totalTransactions: number;
  };
  monthly: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  byType: Array<{
    type: string;
    revenue: number;
    count: number;
  }>;
  byClientType: Array<{
    clientType: string;
    revenue: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    clientType: string;
    price: number;
    date_start: string;
    date_end: string;
    createdAt: string;
    clientInfo: {
      type: string;
      name: string;
      email: string;
    } | null;
  }>;
}

export default function PaymentsPage() {
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/finance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setFinanceData(data.finance);
        }
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données financières...</p>
        </div>
      </div>
    );
  }

  if (!financeData) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-red-600">Erreur lors du chargement des données financières</p>
      </div>
    );
  }

  // Chart data for monthly revenue
  const monthlyChartData = {
    labels: financeData.monthly.map(m => m.month),
    datasets: [
      {
        label: 'Revenus (DA)',
        data: financeData.monthly.map(m => m.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
      {
        label: 'Nombre de transactions',
        data: financeData.monthly.map(m => m.count),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  // Chart data for revenue by type
  const typeChartData = {
    labels: financeData.byType.map(t => t.type),
    datasets: [
      {
        data: financeData.byType.map(t => t.revenue),
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart data for revenue by client type
  const clientTypeChartData = {
    labels: financeData.byClientType.map(c => c.clientType === 'User' ? 'Clients' : 'Ateliers'),
    datasets: [
      {
        data: financeData.byClientType.map(c => c.revenue),
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(139, 92, 246, 0.6)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
        ],
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

  const monthlyChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        position: 'left' as const,
      },
      y1: {
        beginAtZero: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
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

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR');
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
          Gestion Financière
        </h1>
        <p className="text-gray-600">Vue d'ensemble des revenus et transactions</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-2">Revenus Totaux</p>
              <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">
                {formatPrice(financeData.overview.totalRevenue)} DA
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 border border-green-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-2">Ce Mois</p>
              <p className="text-3xl font-bold text-green-900 font-[var(--font-poppins)]">
                {formatPrice(financeData.overview.thisMonthRevenue)} DA
              </p>
              <p className={`text-xs mt-2 flex items-center gap-1 ${financeData.overview.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {financeData.overview.growth >= 0 ? '+' : ''}{financeData.overview.growth.toFixed(1)}% vs mois dernier
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl shadow-lg p-6 border border-purple-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium mb-2">Cette Année</p>
              <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">
                {formatPrice(financeData.overview.thisYearRevenue)} DA
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl shadow-lg p-6 border border-teal-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-700 font-medium mb-2">Total Transactions</p>
              <p className="text-3xl font-bold text-teal-900 font-[var(--font-poppins)]">
                {financeData.overview.totalTransactions.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Revenus Mensuels</h3>
          <div className="h-64">
            <Bar data={monthlyChartData} options={monthlyChartOptions} />
          </div>
        </div>

        {/* Revenue by Type Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Revenus par Type d'Abonnement</h3>
          <div className="h-64">
            <Doughnut data={typeChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Revenue by Client Type */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Revenus par Type de Client</h3>
        <div className="h-64">
          <Doughnut data={clientTypeChartData} options={chartOptions} />
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Transactions Récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Client</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Montant</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date de Début</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date de Fin</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date de Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {financeData.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {transaction.clientInfo ? (
                      <div>
                        <p className="font-semibold text-gray-900">{transaction.clientInfo.name}</p>
                        <p className="text-xs text-gray-500">{transaction.clientInfo.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          transaction.clientType === 'User' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {transaction.clientType === 'User' ? 'Client' : 'Atelier'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(transaction.price)} DA
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDate(transaction.date_start)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDate(transaction.date_end)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDate(transaction.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
