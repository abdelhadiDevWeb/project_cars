'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

interface Stats {
  activeCars: number;
  totalCars: number;
  unreadNotifications: number;
  totalNotifications: number;
  totalAppointments: number;
  upcomingAppointments: number;
}

interface RecentAppointment {
  _id: string;
  id?: string;
  id_workshop: {
    name: string;
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

interface RecentNotification {
  _id: string;
  id?: string;
  id_sender: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  message: string;
  type: string;
  createdAt: string;
}

export default function DashboardSellerPage() {
  const router = useRouter();
  const { user, token, isLoading: userLoading } = useUser();
  const [stats, setStats] = useState<Stats>({
    activeCars: 0,
    totalCars: 0,
    unreadNotifications: 0,
    totalNotifications: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
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
          setRecentAppointments(data.recentAppointments || []);
          setRecentNotifications(data.recentNotifications || []);
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

  if (userLoading || loading) {
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

  const statsCards = [
    { 
      title: 'Véhicules Actifs', 
      value: stats.activeCars.toString(), 
      icon: 'car', 
      color: 'blue', 
      change: `${stats.totalCars} au total` 
    },
    { 
      title: 'Messages', 
      value: stats.unreadNotifications.toString(), 
      icon: 'message', 
      color: 'purple', 
      change: `${stats.totalNotifications} messages` 
    },
    { 
      title: 'Rendez-vous', 
      value: stats.totalAppointments.toString(), 
      icon: 'appointment', 
      color: 'orange', 
      change: `${stats.upcomingAppointments} à venir` 
    },
    { 
      title: 'Véhicules Total', 
      value: stats.totalCars.toString(), 
      icon: 'car', 
      color: 'green', 
      change: `${stats.activeCars} actifs` 
    },
  ];

  // Combine recent appointments and notifications for activity feed
  const recentActivity = [
    ...recentAppointments.map(apt => ({
      type: 'appointment' as const,
      car: `${apt.id_car?.brand} ${apt.id_car?.model} ${apt.id_car?.year}`,
      time: formatTimeAgo(apt.createdAt),
      user: apt.id_workshop?.name || 'Atelier',
      status: apt.status,
    })),
    ...recentNotifications.map(notif => ({
      type: 'message' as const,
      car: '',
      time: formatTimeAgo(notif.createdAt),
      user: notif.id_sender?.name || 
            (notif.id_sender?.firstName && notif.id_sender?.lastName 
              ? `${notif.id_sender.firstName} ${notif.id_sender.lastName}` 
              : 'Utilisateur'),
      message: notif.message,
    })),
  ].sort((a, b) => {
    // Sort by time (most recent first)
    const timeA = a.time.includes('secondes') ? 0 : 
                  a.time.includes('minutes') ? 1 : 
                  a.time.includes('heures') ? 2 : 3;
    const timeB = b.time.includes('secondes') ? 0 : 
                  b.time.includes('minutes') ? 1 : 
                  b.time.includes('heures') ? 2 : 3;
    return timeA - timeB;
  }).slice(0, 5);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Tableau de bord</h1>
        <p className="text-gray-600">Bienvenue dans votre espace vendeur</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsCards.map((stat, index) => {
          const colorClasses = {
            blue: {
              bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
              border: 'border-blue-200/50',
              text: 'text-blue-700',
              textBold: 'text-blue-900',
              textLight: 'text-blue-600',
              icon: 'bg-gradient-to-br from-blue-500 to-blue-600',
            },
            green: {
              bg: 'bg-gradient-to-br from-green-50 to-green-100',
              border: 'border-green-200/50',
              text: 'text-green-700',
              textBold: 'text-green-900',
              textLight: 'text-green-600',
              icon: 'bg-gradient-to-br from-green-500 to-green-600',
            },
            purple: {
              bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
              border: 'border-purple-200/50',
              text: 'text-purple-700',
              textBold: 'text-purple-900',
              textLight: 'text-purple-600',
              icon: 'bg-gradient-to-br from-purple-500 to-purple-600',
            },
            orange: {
              bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
              border: 'border-orange-200/50',
              text: 'text-orange-700',
              textBold: 'text-orange-900',
              textLight: 'text-orange-600',
              icon: 'bg-gradient-to-br from-orange-500 to-orange-600',
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
                  {stat.icon === 'car' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                  )}
                  {stat.icon === 'message' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                  )}
                  {stat.icon === 'appointment' && (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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
        <Link href="/dashboard-seller/add-car" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Ajouter une voiture</h3>
              <p className="text-sm text-gray-600">Publiez un nouveau véhicule</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard-seller/my-cars" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Mes voitures</h3>
              <p className="text-sm text-gray-600">Gérez vos annonces</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard-seller/appointments" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">Rendez-vous</h3>
              <p className="text-sm text-gray-600">Voir les demandes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Activité récente</h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activity.type === 'appointment' ? 'bg-orange-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'appointment' && (
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  )}
                  {activity.type === 'message' && (
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  {activity.type === 'appointment' && (
                    <p className="font-semibold text-gray-900">
                      Rendez-vous avec {activity.user} pour {activity.car}
                    </p>
                  )}
                  {activity.type === 'message' && (
                    <p className="font-semibold text-gray-900">
                      {activity.user}: {activity.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
