'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getImageUrl } from "@/utils/backend";

interface Stats {
  pendingAppointments: number;
  totalAppointments: number;
  upcomingAppointments: number;
  appointmentsThisMonth: number;
  acceptedAppointments: number;
}

interface RecentAppointment {
  _id: string;
  id?: string;
  id_owner_car: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  id_car: {
    brand: string;
    model: string;
    year: number;
  };
  date: string;
  time: string;
  status: string;
  createdAt: string;
}

export default function WorkshopDashboardPage() {
  const { user, token, isLoading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    pendingAppointments: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    appointmentsThisMonth: 0,
    acceptedAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
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
          setRecentAppointments(data.recentAppointments || []);
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
  }, [user, token]);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Il y a quelques secondes';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} minutes`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} heures`;
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`;
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'en_attente': 'En attente',
      'accepted': 'Accepté',
      'refused': 'Refusé',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return 'bg-green-100 text-green-700';
    if (status === 'refused') return 'bg-red-100 text-red-700';
    return 'bg-orange-100 text-orange-700';
  };

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

  const statsCards = [
    { 
      title: 'Rendez-vous en attente', 
      value: stats.pendingAppointments.toString(), 
      icon: 'pending', 
      color: 'orange', 
      change: `${stats.totalAppointments} au total` 
    },
    { 
      title: 'Rendez-vous ce mois', 
      value: stats.appointmentsThisMonth.toString(), 
      icon: 'check', 
      color: 'green', 
      change: `${stats.acceptedAppointments} acceptés` 
    },
    { 
      title: 'Rendez-vous à venir', 
      value: stats.upcomingAppointments.toString(), 
      icon: 'appointment', 
      color: 'blue', 
      change: 'Cette semaine' 
    },
    { 
      title: 'Total rendez-vous', 
      value: stats.totalAppointments.toString(), 
      icon: 'rating', 
      color: 'purple', 
      change: 'Tous les temps' 
    },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

        <Link href="/dashboard-workshop/today" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Liste du jour</h3>
              <p className="text-sm text-gray-600">Voir les rendez-vous d'aujourd'hui</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Rendez-vous récents</h2>
          <Link href="/dashboard-workshop/appointments" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir tout →
          </Link>
        </div>
        {recentAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>Aucun rendez-vous récent</p>
          </div>
        ) : (
        <div className="space-y-4">
            {recentAppointments.map((appointment) => (
              <div key={appointment._id || appointment.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(appointment.status)}`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                      <p className="font-semibold text-gray-900">
                        {appointment.id_car?.brand} {appointment.id_car?.model} {appointment.id_car?.year}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.id_owner_car?.firstName} {appointment.id_owner_car?.lastName} • {formatTimeAgo(appointment.createdAt)}
                      </p>
                  </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusLabel(appointment.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
