'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import Image from "next/image";
import { getImageUrl } from "@/utils/backend";

interface Appointment {
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
    images?: string[];
  };
  date: string;
  time: string;
  status: 'en_attente' | 'accepted' | 'refused';
  createdAt: string;
}

interface TodayStats {
  total: number;
  completed: number;
  pending: number;
  progress: number;
}

export default function TodayPage() {
  const { user, token } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<TodayStats>({
    total: 0,
    completed: 0,
    pending: 0,
    progress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayAppointments = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        const res = await fetch('/api/workshop-stats/today', {
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
          setAppointments(data.appointments || []);
          setStats(data.stats || { total: 0, completed: 0, pending: 0, progress: 0 });
        }
      } catch (error) {
        console.error('Error fetching today appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchTodayAppointments();
    }
  }, [user, token]);

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'en_attente': 'En attente',
      'accepted': 'Accepté',
      'refused': 'Refusé',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'refused') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-orange-100 text-orange-700 border-orange-300';
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

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Liste du jour</h1>
        <p className="text-gray-600">{today}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Progression du jour</h2>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600 font-[var(--font-poppins)]">{stats.progress}%</p>
            <p className="text-sm text-gray-600">{stats.completed} / {stats.total} terminés</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${stats.progress}%` }}
          >
            {stats.progress > 10 && (
              <span className="text-xs font-bold text-white">{stats.progress}%</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600 font-[var(--font-poppins)]">{stats.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600 font-[var(--font-poppins)]">{stats.completed}</p>
            <p className="text-sm text-gray-600 mt-1">Terminés</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-600 font-[var(--font-poppins)]">{stats.pending}</p>
            <p className="text-sm text-gray-600 mt-1">En attente</p>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Rendez-vous du jour</h2>
        
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">Aucun rendez-vous aujourd'hui</p>
            <p className="text-sm mt-2">Vous n'avez pas de rendez-vous prévus pour aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div 
                key={appointment._id || appointment.id} 
                className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${getStatusColor(appointment.status)}`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Car Image */}
                  <div className="w-full lg:w-48 flex-shrink-0 relative h-48 rounded-xl overflow-hidden border border-gray-200">
                    {appointment.id_car?.images && appointment.id_car.images.length > 0 && getImageUrl(appointment.id_car.images[0]) ? (
                      <Image
                        src={getImageUrl(appointment.id_car.images[0])!}
                        alt={`${appointment.id_car.brand} ${appointment.id_car.model}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        Aucune image
                      </div>
                    )}
                  </div>

                  {/* Appointment Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
                          {appointment.id_car?.brand} {appointment.id_car?.model} {appointment.id_car?.year}
                        </h3>
                        <div className="flex items-center gap-4 mb-3">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                          <span className="text-lg font-semibold text-gray-700">
                            {appointment.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Information */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Informations du client</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p className="font-medium">{appointment.id_owner_car?.firstName} {appointment.id_owner_car?.lastName}</p>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${appointment.id_owner_car?.phone}`} className="text-blue-600 hover:text-blue-700 font-medium">
                            {appointment.id_owner_car?.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <a href={`mailto:${appointment.id_owner_car?.email}`} className="text-blue-600 hover:text-blue-700 font-medium">
                            {appointment.id_owner_car?.email}
                          </a>
                        </div>
                      </div>
                    </div>
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
