'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getImageUrl, getBackendUrl } from "@/utils/backend";
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from "react-qr-code";

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
    certifie?: boolean;
  };
  id_car: {
    _id: string;
    brand: string;
    model: string;
    year: number;
    images?: string[];
    qr?: string;
  } | null;
  date: string;
  time: string;
  status: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish';
  createdAt: string;
  images?: string[];
  rapport_pdf?: string;
}

export default function WorkshopAppointmentsPage() {
  const router = useRouter();
  const { user, token, isLoading: userLoading } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish'>('all');
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newNotifications, setNewNotifications] = useState<{
    all: boolean;
    en_attente: boolean;
    accepted: boolean;
    en_cours: boolean;
    finish: boolean;
    refused: boolean;
  }>({
    all: false,
    en_attente: false,
    accepted: false,
    en_cours: false,
    finish: false,
    refused: false,
  });

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

  useEffect(() => {
    if (user && token) {
      fetchAppointments();
    }
  }, [user, token]);

  // Socket.IO setup for real-time notifications
  useEffect(() => {
    if (!user || !token) return;

    const backendUrl = getBackendUrl();
    const newSocket = io(backendUrl, {
      auth: {
        token: token,
      },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for workshop appointments');
      newSocket.emit('join_user', user._id);
    });

    // Listen for notification of appointment updates
    newSocket.on('new_notification', (data: any) => {
      console.log('New notification received:', data);
      
      // Determine which section this notification is for
      let targetStatus: 'all' | 'en_attente' | 'accepted' | 'en_cours' | 'finish' | 'refused' | null = null;
      
      if (data.type === 'rdv_workshop' || data.message?.toLowerCase().includes('nouveau') || data.message?.toLowerCase().includes('demande')) {
        targetStatus = 'en_attente';
      } else if (data.type === 'accept_rdv' || data.message?.toLowerCase().includes('accepté') || data.message?.toLowerCase().includes('accept')) {
        targetStatus = 'accepted';
      } else if (data.message?.toLowerCase().includes('en cours') || data.message?.toLowerCase().includes('commencé')) {
        targetStatus = 'en_cours';
      } else if (data.message?.toLowerCase().includes('terminé') || data.message?.toLowerCase().includes('finish') || data.message?.toLowerCase().includes('fini')) {
        targetStatus = 'finish';
      } else if (data.message?.toLowerCase().includes('refusé') || data.message?.toLowerCase().includes('refused')) {
        targetStatus = 'refused';
      }
      
      // Always refresh appointments when notification arrives
      fetchAppointments();
      
      // If we're not in the target section, show notification indicator
      if (targetStatus && filter !== targetStatus && filter !== 'all') {
        setNewNotifications(prev => ({
          ...prev,
          [targetStatus]: true,
        }));
      } else if (targetStatus && filter === 'all') {
        // If filter is 'all', show notification on the specific status button
        setNewNotifications(prev => ({
          ...prev,
          [targetStatus]: true,
        }));
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_user', user._id);
        newSocket.disconnect();
      }
    };
  }, [user, token, filter]);

  const handleStatusChange = async (appointmentId: string, newStatus: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish') => {
    // Check if the appointment is for today before status change
    const appointment = appointments.find(apt => (apt._id || apt.id) === appointmentId);
    const isToday = appointment && appointment.date ? (() => {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      return appointmentDate.toDateString() === today.toDateString();
    })() : false;
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
      
      // Refresh appointments to get updated data
      const refreshRes = await fetch('/api/rdv-workshop/workshop-appointments', {
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
      
      // If appointment was accepted and is for today, update the badge in sidebar
      if (newStatus === 'accepted' && isToday) {
        // Dispatch event to update today count badge in layout
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('appointmentStatusChanged'));
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
    setSuccessMessage('');

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
      const refreshRes = await fetch('/api/rdv-workshop/workshop-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.ok && refreshData.appointments) {
          setAppointments(refreshData.appointments);
          // Update selectedAppointment with new data
          const updatedAppointment = refreshData.appointments.find(
            (apt: Appointment) => (apt._id || apt.id) === (selectedAppointment._id || selectedAppointment.id)
          );
          if (updatedAppointment) {
            setSelectedAppointment(updatedAppointment);
          }
        }
      }

      // Update selectedAppointment with new data
      const updatedAppointment = refreshData.appointments.find(
        (apt: Appointment) => (apt._id || apt.id) === (selectedAppointment._id || selectedAppointment.id)
      );
      if (updatedAppointment) {
        setSelectedAppointment(updatedAppointment);
      }

      // Only close modal if both images and PDF are uploaded
      const hasImages = updatedAppointment?.images && updatedAppointment.images.length > 0;
      const hasPdf = updatedAppointment?.rapport_pdf;
      
      if (hasImages && hasPdf) {
        // Both are uploaded, close modal
        setShowUploadModal(false);
        setSelectedImages([]);
        setSelectedAppointment(null);
        setSuccessMessage('');
      } else {
        // Images uploaded but PDF not yet, keep modal open
        setSuccessMessage(`Images uploadées avec succès ! (${selectedImages.length} image(s))`);
        setSelectedImages([]);
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
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
    setSuccessMessage('');

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
      const refreshRes = await fetch('/api/rdv-workshop/workshop-appointments', {
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

      // Update selectedAppointment with new data
      const updatedAppointment = refreshData.appointments.find(
        (apt: Appointment) => (apt._id || apt.id) === (selectedAppointment._id || selectedAppointment.id)
      );
      if (updatedAppointment) {
        setSelectedAppointment(updatedAppointment);
      }

      // Only close modal if both images and PDF are uploaded
      const hasImages = updatedAppointment?.images && updatedAppointment.images.length > 0;
      const hasPdf = updatedAppointment?.rapport_pdf;
      
      if (hasImages && hasPdf) {
        // Both are uploaded, close modal
        setShowUploadModal(false);
        setSelectedPdf(null);
        setSelectedAppointment(null);
        setSelectedImages([]);
        setSuccessMessage('');
      } else {
        // PDF uploaded but images not yet, keep modal open
        setSuccessMessage('PDF uploadé avec succès !');
        setSelectedPdf(null);
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
      setUploadingPdf(false);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setUploadingPdf(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Filter by status
    const matchesStatus = filter === 'all' || apt.status === filter;
    
    // Filter by search term (name or car)
    if (!searchTerm.trim()) {
      return matchesStatus;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const clientName = `${apt.id_owner_car?.firstName || ''} ${apt.id_owner_car?.lastName || ''}`.toLowerCase();
    const carInfo = `${apt.id_car?.brand || ''} ${apt.id_car?.model || ''}`.toLowerCase();
    
    const matchesSearch = clientName.includes(searchLower) || carInfo.includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  const getStatusLabel = (status: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish') => {
    const labels: Record<string, string> = {
      'en_attente': 'En attente',
      'accepted': 'Accepté',
      'refused': 'Refusé',
      'en_cours': 'En cours',
      'finish': 'Terminé',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: 'en_attente' | 'accepted' | 'refused' | 'en_cours' | 'finish') => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'accepted': 'bg-green-100 text-green-700 border-green-200',
      'refused': 'bg-red-100 text-red-700 border-red-200',
      'en_cours': 'bg-blue-100 text-blue-700 border-blue-200',
      'finish': 'bg-purple-100 text-purple-700 border-purple-200',
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

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom du client ou voiture (marque, modèle)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'all' as const, label: 'Tous', count: appointments.length },
            { value: 'en_attente' as const, label: 'En attente', count: appointments.filter(a => a.status === 'en_attente').length },
            { value: 'accepted' as const, label: 'Acceptés', count: appointments.filter(a => a.status === 'accepted').length },
            { value: 'en_cours' as const, label: 'En cours', count: appointments.filter(a => a.status === 'en_cours').length },
            { value: 'finish' as const, label: 'Terminés', count: appointments.filter(a => a.status === 'finish').length },
            { value: 'refused' as const, label: 'Refusés', count: appointments.filter(a => a.status === 'refused').length },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => {
                setFilter(filterOption.value);
                setNewNotifications(prev => ({ ...prev, [filterOption.value]: false }));
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors relative ${
                filter === filterOption.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label} ({filterOption.count})
              {newNotifications[filterOption.value] && filter !== filterOption.value && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
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
                  {appointment.id_car && appointment.id_car.images && appointment.id_car.images.length > 0 && getImageUrl(appointment.id_car.images[0]) ? (
                    <Image
                      src={getImageUrl(appointment.id_car.images[0])!}
                      alt={appointment.id_car ? `${appointment.id_car.brand} ${appointment.id_car.model}` : 'Image de voiture'}
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
                        {appointment.id_car ? `${appointment.id_car.brand} ${appointment.id_car.model} ${appointment.id_car.year}` : 'Voiture non disponible'}
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
                        {appointment.id_owner_car.certifie && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md text-xs font-bold shadow-sm">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Certifié
                          </span>
                        )}
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
                    {appointment.status === 'en_cours' && (
                      <>
                        {/* Only show button if both images and PDF are not uploaded */}
                        {(!appointment.images || appointment.images.length === 0 || !appointment.rapport_pdf) && (
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowUploadModal(true);
                            }}
                            className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            Ajouter images/PDF
                          </button>
                        )}
                        {/* Only show "Terminer" button if both images and PDF are uploaded */}
                        {appointment.images && appointment.images.length > 0 && appointment.rapport_pdf && (
                          <button
                            onClick={() => handleStatusChange(appointment._id || appointment.id!, 'finish')}
                            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            Terminer
                          </button>
                        )}
                      </>
                    )}
                    {appointment.status === 'finish' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowUploadModal(true);
                          }}
                          className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Voir/Gérer images/PDF
                        </button>
                        {/* QR Code Display for Finished Appointments */}
                        {appointment.id_car?._id && (
                          <div className="mt-4 w-full bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                              Code QR de vérification
                            </h4>
                            <div className="flex flex-col items-center gap-2">
                              {appointment.id_car.qr ? (
                                <div className="bg-white p-3 rounded-lg border-2 border-purple-300">
                                  <img 
                                    src={appointment.id_car.qr} 
                                    alt="QR Code" 
                                    className="w-32 h-32"
                                  />
                                </div>
                              ) : (
                                <div className="bg-white p-3 rounded-lg border-2 border-purple-300">
                                  <QRCodeSVG 
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify-car/${appointment.id_car._id}`}
                                    size={128}
                                    level="M"
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-gray-600 text-center">
                                Scannez pour vérifier le statut
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {appointment.status === 'refused' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'accepted')}
                          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment._id || appointment.id!, 'en_attente')}
                          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Remettre en attente
                        </button>
                      </>
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

      {/* Upload Modal */}
      {showUploadModal && selectedAppointment && (
        <>
          <div 
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => {
              setShowUploadModal(false);
              setSelectedAppointment(null);
              setSelectedImages([]);
              setSelectedPdf(null);
              setSuccessMessage('');
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
                      setSuccessMessage('');
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
                {/* Success Message */}
                {successMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
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
