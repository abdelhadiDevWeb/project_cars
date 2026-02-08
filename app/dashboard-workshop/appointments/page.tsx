'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getImageUrl } from "@/utils/backend";

interface Appointment {
  _id: string;
  id?: string;
  id_workshop: string;
  id_owner_car: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
  };
  id_car: {
    _id: string;
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

export default function WorkshopAppointmentsPage() {
  const router = useRouter();
  const { user, token, isLoading: userLoading } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'accepted' | 'refused'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/rdv-workshop/workshop-appointments', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setError("Erreur serveur: réponse invalide");
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data?.message || "Erreur lors de la récupération des rendez-vous");
          setLoading(false);
          return;
        }

        if (data.ok && data.appointments) {
          setAppointments(data.appointments);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchAppointments();
    }
  }, [user, token]);

  const handleStatusChange = async (appointmentId: string, newStatus: 'en_attente' | 'accepted' | 'refused') => {
    try {
      if (!token) {
        setError("Token d'authentification manquant");
        return;
      }

      const res = await fetch(`/api/rdv-workshop/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        setError("Erreur serveur: réponse invalide");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors de la mise à jour du statut");
        return;
      }

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          (apt._id || apt.id) === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
    }
  };

  const filteredAppointments = filter === 'all'
    ? appointments
    : appointments.filter(apt => apt.status === filter);

  const getStatusLabel = (status: 'en_attente' | 'accepted' | 'refused') => {
    const labels: Record<string, string> = {
      'en_attente': 'En attente',
      'accepted': 'Accepté',
      'refused': 'Refusé',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: 'en_attente' | 'accepted' | 'refused') => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'accepted': 'bg-green-100 text-green-700 border-green-200',
      'refused': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (userLoading) {
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

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Rendez-vous</h1>
        <p className="text-gray-600">Gérez les demandes de rendez-vous des clients</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'all' as const, label: 'Tous', count: appointments.length },
            { value: 'en_attente' as const, label: 'En attente', count: appointments.filter(a => a.status === 'en_attente').length },
            { value: 'accepted' as const, label: 'Acceptés', count: appointments.filter(a => a.status === 'accepted').length },
            { value: 'refused' as const, label: 'Refusés', count: appointments.filter(a => a.status === 'refused').length },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                filter === filterOption.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600">
            Aucun rendez-vous {
              filter !== 'all' 
                ? filter === 'en_attente' ? 'en attente' 
                : filter === 'accepted' ? 'accepté' 
                : 'refusé'
                : ''
            } trouvé
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment._id || appointment.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Car Image */}
                <div className="relative w-full lg:w-48 h-48 rounded-xl overflow-hidden flex-shrink-0">
                  {appointment.id_car.images && appointment.id_car.images.length > 0 && getImageUrl(appointment.id_car.images[0]) ? (
                    <Image
                      src={getImageUrl(appointment.id_car.images[0])!}
                      alt={`${appointment.id_car.brand} ${appointment.id_car.model}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Appointment Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
                        {appointment.id_car.brand} {appointment.id_car.model} {appointment.id_car.year}
                      </h3>
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Informations du client</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">
                          {appointment.id_owner_car.firstName} {appointment.id_owner_car.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${appointment.id_owner_car.phone}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          {appointment.id_owner_car.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${appointment.id_owner_car.email}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          {appointment.id_owner_car.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(appointment.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {appointment.time}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    {appointment.status === 'en_attente' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'accepted')}
                          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'refused')}
                          className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {appointment.status === 'accepted' && (
                      <button
                        onClick={() => handleStatusChange(appointment._id || appointment.id!, 'en_attente')}
                        className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors text-sm"
                      >
                        Remettre en attente
                      </button>
                    )}
                    {appointment.status === 'refused' && (
                      <button
                        onClick={() => handleStatusChange(appointment._id || appointment.id!, 'en_attente')}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors text-sm"
                      >
                        Remettre en attente
                      </button>
                    )}
                    <a
                      href={`tel:${appointment.id_owner_car.phone}`}
                      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Appeler
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
