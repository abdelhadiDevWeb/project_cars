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
  status: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish';
  createdAt: string;
  images?: string[];
  rapport_pdf?: string;
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
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);

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
      'en_cours': 'En cours',
      'finish': 'Terminé',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'refused') return 'bg-red-100 text-red-700 border-red-300';
    if (status === 'en_cours') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'finish') return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-orange-100 text-orange-700 border-orange-300';
  };

  const handleStatusChange = async (appointmentId: string, newStatus: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish') => {
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

      // Refresh appointments
      const refreshRes = await fetch('/api/workshop-stats/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.ok && refreshData.appointments) {
          setAppointments(refreshData.appointments);
          setStats(refreshData.stats || { total: 0, completed: 0, pending: 0, progress: 0 });
        }
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
    }
  };

  const handleUploadImages = async () => {
    if (!selectedAppointment || selectedImages.length === 0) return;

    setUploadingImages(true);
    setError('');

    try {
      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });

      const res = await fetch(`/api/rdv-workshop/${selectedAppointment._id || selectedAppointment.id}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors de l'upload des images");
        setUploadingImages(false);
        return;
      }

      // Refresh appointments
      const refreshRes = await fetch('/api/workshop-stats/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.ok && refreshData.appointments) {
          setAppointments(refreshData.appointments);
        }
      }

      setShowUploadModal(false);
      setSelectedImages([]);
      setSelectedAppointment(null);
      setUploadingImages(false);
    } catch (error) {
      console.error('Error uploading images:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setUploadingImages(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedAppointment || !selectedPdf) return;

    setUploadingPdf(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('rapport_pdf', selectedPdf);

      const res = await fetch(`/api/rdv-workshop/${selectedAppointment._id || selectedAppointment.id}/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors de l'upload du PDF");
        setUploadingPdf(false);
        return;
      }

      // Refresh appointments
      const refreshRes = await fetch('/api/workshop-stats/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.ok && refreshData.appointments) {
          setAppointments(refreshData.appointments);
        }
      }

      setShowUploadModal(false);
      setSelectedPdf(null);
      setSelectedAppointment(null);
      setUploadingPdf(false);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setUploadingPdf(false);
    }
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

      {/* En Cours Appointments Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rendez-vous en cours ({appointments.filter(a => a.status === 'en_cours').length})
          </h2>
        </div>
        
        {appointments.filter(a => a.status === 'en_cours').length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Aucun rendez-vous en cours aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter(a => a.status === 'en_cours')
              .map((appointment) => (
                <div 
                  key={appointment._id || appointment.id} 
                  className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50/50 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Car Image */}
                    <div className="w-full lg:w-48 flex-shrink-0 relative h-48 rounded-xl overflow-hidden border-2 border-blue-300 shadow-md">
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
                            <span className="px-4 py-2 rounded-full text-sm font-bold border-2 bg-blue-100 text-blue-700 border-blue-300">
                              {getStatusLabel(appointment.status)}
                            </span>
                            <span className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {appointment.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Owner Information */}
                      <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
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

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowUploadModal(true);
                          }}
                          className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Ajouter images/PDF
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'finish')}
                          className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Terminer la vérification
                        </button>
                        <a
                          href={`tel:${appointment.id_owner_car?.phone}`}
                          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
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

      {/* Accepted Appointments Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] flex items-center gap-2">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rendez-vous acceptés ({appointments.filter(a => a.status === 'accepted').length})
          </h2>
        </div>
        
        {appointments.filter(a => a.status === 'accepted').length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Aucun rendez-vous accepté aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter(a => a.status === 'accepted')
              .map((appointment) => (
                <div 
                  key={appointment._id || appointment.id} 
                  className="p-6 rounded-xl border-2 border-green-200 bg-green-50/50 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Car Image */}
                    <div className="w-full lg:w-48 flex-shrink-0 relative h-48 rounded-xl overflow-hidden border-2 border-green-300 shadow-md">
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
                            <span className="px-4 py-2 rounded-full text-sm font-bold border-2 bg-green-100 text-green-700 border-green-300">
                              {getStatusLabel(appointment.status)}
                            </span>
                            <span className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {appointment.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Owner Information */}
                      <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
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

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'en_cours')}
                          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Commencer la vérification
                        </button>
                        <a
                          href={`tel:${appointment.id_owner_car?.phone}`}
                          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
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

      {/* Finished Appointments Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rendez-vous terminés ({appointments.filter(a => a.status === 'finish').length})
          </h2>
        </div>
        
        {appointments.filter(a => a.status === 'finish').length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Aucun rendez-vous terminé aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter(a => a.status === 'finish')
              .map((appointment) => (
                <div 
                  key={appointment._id || appointment.id} 
                  className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50/50 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Car Image */}
                    <div className="w-full lg:w-48 flex-shrink-0 relative h-48 rounded-xl overflow-hidden border-2 border-purple-300 shadow-md">
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
                            <span className="px-4 py-2 rounded-full text-sm font-bold border-2 bg-purple-100 text-purple-700 border-purple-300">
                              {getStatusLabel(appointment.status)}
                            </span>
                            <span className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {appointment.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Owner Information */}
                      <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
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

                      {/* Show uploaded images and PDF if available */}
                      {(appointment.images && appointment.images.length > 0) || appointment.rapport_pdf ? (
                        <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Fichiers de vérification</h4>
                          {appointment.images && appointment.images.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-600 mb-2">Images ({appointment.images.length})</p>
                              <div className="grid grid-cols-4 gap-2">
                                {appointment.images.slice(0, 4).map((image, index) => (
                                  <div key={index} className="relative h-16 rounded-lg overflow-hidden border border-gray-200">
                                    <Image
                                      src={getImageUrl(image) || image}
                                      alt={`Image ${index + 1}`}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {appointment.rapport_pdf && (
                            <div>
                              <a
                                href={getImageUrl(appointment.rapport_pdf) || appointment.rapport_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Voir le rapport PDF
                              </a>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowUploadModal(true);
                          }}
                          className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Voir/Gérer fichiers
                        </button>
                        <a
                          href={`tel:${appointment.id_owner_car?.phone}`}
                          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
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

      {/* Upload Modal - Same as appointments page */}
      {showUploadModal && selectedAppointment && (
        <>
          <div 
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => {
              setShowUploadModal(false);
              setSelectedAppointment(null);
              setSelectedImages([]);
              setSelectedPdf(null);
            }}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-slideUp modal-scroll-blue">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                        Gérer les fichiers
                      </h2>
                      <p className="text-sm text-blue-50 mt-1">
                        {selectedAppointment.id_car.brand} {selectedAppointment.id_car.model} {selectedAppointment.id_car.year}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedAppointment(null);
                      setSelectedImages([]);
                      setSelectedPdf(null);
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Existing Images */}
                {selectedAppointment.images && selectedAppointment.images.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Images existantes ({selectedAppointment.images.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedAppointment.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={getImageUrl(image) || image}
                            alt={`Image ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Images */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter des images
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedImages(files);
                    }}
                    className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg bg-white hover:border-blue-400 transition-colors cursor-pointer"
                  />
                  {selectedImages.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-700">{selectedImages.length} image(s) sélectionnée(s)</p>
                    </div>
                  )}
                  <button
                    onClick={handleUploadImages}
                    disabled={uploadingImages || selectedImages.length === 0}
                    className="mt-3 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploadingImages ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Uploader les images
                      </>
                    )}
                  </button>
                </div>

                {/* Upload PDF */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {selectedAppointment.rapport_pdf ? 'Remplacer le rapport PDF' : 'Ajouter un rapport PDF'}
                  </label>
                  {selectedAppointment.rapport_pdf && (
                    <a
                      href={getImageUrl(selectedAppointment.rapport_pdf) || selectedAppointment.rapport_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-3 p-3 bg-white rounded-lg border border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Voir le PDF actuel
                    </a>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedPdf(file);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg bg-white hover:border-purple-400 transition-colors cursor-pointer"
                  />
                  {selectedPdf && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-700 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {selectedPdf.name}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleUploadPdf}
                    disabled={uploadingPdf || !selectedPdf}
                    className="mt-3 w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploadingPdf ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {selectedAppointment.rapport_pdf ? 'Remplacer le PDF' : 'Uploader le PDF'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
