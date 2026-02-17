'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getImageUrl } from "@/utils/backend";
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '@/utils/backend';

interface Workshop {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  adr: string;
  status: boolean;
}

interface Car {
  _id: string;
  id?: string;
  brand: string;
  model: string;
  year: number;
  images: string[];
}

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [loadingCars, setLoadingCars] = useState(true);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [loadingMyAppointments, setLoadingMyAppointments] = useState(true);
  const [activeTab, setActiveTab] = useState<'book' | 'my-appointments'>('book');
  const [appointmentFilter, setAppointmentFilter] = useState<'accepted' | 'en_cours' | 'finish'>('accepted');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newNotifications, setNewNotifications] = useState<{
    accepted: boolean;
    en_cours: boolean;
    finish: boolean;
  }>({
    accepted: false,
    en_cours: false,
    finish: false,
  });

  // Check URL parameter for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'my-appointments') {
      setActiveTab('my-appointments');
    }
  }, [searchParams]);

  // Fetch workshops
  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        setLoadingWorkshops(true);
        const res = await fetch('/api/workshop/active');
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.workshops) {
            setWorkshops(data.workshops);
          }
        }
      } catch (error) {
        console.error('Error fetching workshops:', error);
      } finally {
        setLoadingWorkshops(false);
      }
    };

    fetchWorkshops();
  }, []);

  // Fetch user's cars
  useEffect(() => {
    const fetchCars = async () => {
      if (!user) return;

      try {
        setLoadingCars(true);
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/car/my-cars', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.cars) {
            setCars(data.cars);
          }
        }
      } catch (error) {
        console.error('Error fetching cars:', error);
      } finally {
        setLoadingCars(false);
      }
    };

    if (user) {
      fetchCars();
    }
  }, [user, router]);

  // Fetch user's appointments
  const fetchMyAppointments = async () => {
    if (!user) return;

    try {
      setLoadingMyAppointments(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/rdv-workshop/my-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        setLoadingMyAppointments(false);
        return;
      }

      const data = await res.json();

      console.log('📋 Appointments response:', data);

      if (res.ok && data.ok && data.appointments) {
        console.log('✅ Found appointments:', data.appointments.length);
        setMyAppointments(data.appointments);
      } else {
        console.error('❌ Error fetching appointments:', data?.message || 'Unknown error');
        setMyAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingMyAppointments(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyAppointments();
    }
  }, [user, router]);

  // Initialize Socket.io connection for real-time updates
  useEffect(() => {
    if (!user) return;

    const backendUrl = getBackendUrl();
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join_user', user._id);
    });

    // Listen for notification of appointment updates
    newSocket.on('new_notification', (data: any) => {
      console.log('New notification received:', data);
      
      // Determine which section this notification is for
      let targetStatus: 'accepted' | 'en_cours' | 'finish' | null = null;
      
      if (data.type === 'rdv_workshop' || data.type === 'accept_rdv' || data.message?.toLowerCase().includes('accepté') || data.message?.toLowerCase().includes('accept')) {
        targetStatus = 'accepted';
      } else if (data.message?.toLowerCase().includes('en cours') || data.message?.toLowerCase().includes('commencé')) {
        targetStatus = 'en_cours';
      } else if (data.message?.toLowerCase().includes('terminé') || data.message?.toLowerCase().includes('finish') || data.message?.toLowerCase().includes('fini')) {
        targetStatus = 'finish';
      }
      
      // Always refresh appointments when notification arrives
      fetchMyAppointments();
      
      // If we're not in the target section, show notification indicator
      if (targetStatus && appointmentFilter !== targetStatus && activeTab === 'my-appointments') {
        setNewNotifications(prev => ({
          ...prev,
          [targetStatus]: true,
        }));
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (newSocket) {
        newSocket.emit('leave_user', user._id);
        newSocket.disconnect();
      }
    };
  }, [user]);

  // Fetch available times when date or workshop changes
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedWorkshop || !appointmentDate) {
        setAvailableTimes([]);
        setUnavailableTimes([]);
        return;
      }

      try {
        setLoadingTimes(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(
          `/api/rdv-workshop/available-times?id_workshop=${selectedWorkshop._id || selectedWorkshop.id}&date=${appointmentDate}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
    },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setAvailableTimes(data.availableTimes || []);
            setUnavailableTimes(data.unavailableTimes || []);
          }
        }
      } catch (error) {
        console.error('Error fetching available times:', error);
      } finally {
        setLoadingTimes(false);
      }
    };

    fetchAvailableTimes();
  }, [selectedWorkshop, appointmentDate]);

  const handleBookAppointment = (workshop: Workshop) => {
    if (cars.length === 0) {
      setError("Vous devez avoir au moins une voiture pour prendre un rendez-vous");
      return;
    }
    setSelectedWorkshop(workshop);
    setShowBookingModal(true);
    setError('');
    setSuccess('');
    setAppointmentDate('');
    setAppointmentTime('');
    setAvailableTimes([]);
    setUnavailableTimes([]);
  };

  const handleCreateAppointment = async () => {
    if (!selectedWorkshop || !selectedCar || !appointmentDate || !appointmentTime) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/rdv-workshop/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
    },
        body: JSON.stringify({
          id_workshop: selectedWorkshop._id || selectedWorkshop.id,
          id_car: selectedCar._id || selectedCar.id,
          date: appointmentDate,
          time: appointmentTime,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        setError("Erreur serveur: réponse invalide");
        setIsCreating(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = data?.message || "Erreur lors de la création du rendez-vous";
        
        // If time is not available, show unavailable times
        if (data?.unavailableTimes && Array.isArray(data.unavailableTimes)) {
          setUnavailableTimes(data.unavailableTimes);
          errorMessage += `. Créneaux non disponibles : ${data.unavailableTimes.join(', ')}`;
        }
        
        setError(errorMessage);
        setIsCreating(false);
        return;
      }

      setSuccess("Rendez-vous créé avec succès !");
      setShowBookingModal(false);
      setSelectedWorkshop(null);
      setSelectedCar(null);
      setAppointmentDate('');
      setAppointmentTime('');
      setIsCreating(false);

      // Refresh appointments list
      if (token) {
        const refreshRes = await fetch('/api/rdv-workshop/my-appointments', {
          headers: {
            'Authorization': `Bearer ${token}`,
    },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.ok && refreshData.appointments) {
            setMyAppointments(refreshData.appointments);
          }
        }
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsCreating(false);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (userLoading) {
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'en_attente': 'En attente',
      'accepted': 'Accepté',
      'refused': 'Refusé',
      'en_cours': 'En cours',
      'finish': 'Terminé',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'accepted': 'bg-green-100 text-green-700 border-green-200',
      'refused': 'bg-red-100 text-red-700 border-red-200',
      'en_cours': 'bg-blue-100 text-blue-700 border-blue-200',
      'finish': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
          Rendez-vous pour atelier
        </h1>
        <p className="text-gray-600">Réservez un rendez-vous avec un atelier pour vérifier votre véhicule</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-2xl shadow-lg p-2 border border-gray-200 inline-flex">
        <button
          onClick={() => setActiveTab('book')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'book'
              ? 'bg-teal-500 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          Réserver un rendez-vous
        </button>
        <button
          onClick={() => setActiveTab('my-appointments')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'my-appointments'
              ? 'bg-teal-500 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          Mes rendez-vous
        </button>
      </div>

      {/* Error/Success Messages */}
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

      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Book Appointment Section */}
      {activeTab === 'book' && (
        <>
          {/* Workshops List */}
          {loadingWorkshops ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-12 w-12 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : workshops.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-600">Aucun atelier disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workshops.map((workshop) => (
            <div key={workshop._id || workshop.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {workshop.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-1">
                    {workshop.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{workshop.adr}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${workshop.phone}`} className="text-teal-600 hover:text-teal-700 font-medium">
                    {workshop.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${workshop.email}`} className="text-teal-600 hover:text-teal-700 font-medium">
                    {workshop.email}
                  </a>
                </div>
              </div>

              <button
                onClick={() => handleBookAppointment(workshop)}
                className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors"
              >
                Prendre un rendez-vous
              </button>
            </div>
          ))}
        </div>
      )}

          {/* Booking Modal */}
      {showBookingModal && selectedWorkshop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">
                Réserver un rendez-vous
              </h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedWorkshop(null);
                  setSelectedCar(null);
                  setAppointmentDate('');
                  setAppointmentTime('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Atelier</p>
              <p className="font-semibold text-gray-900">{selectedWorkshop.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner une voiture *
                </label>
                {loadingCars ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-6 w-6 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : cars.length === 0 ? (
                  <p className="text-sm text-red-600">Vous n'avez aucune voiture. Veuillez d'abord ajouter une voiture.</p>
                ) : (
                  <select
                    value={selectedCar?._id || selectedCar?.id || ''}
                    onChange={(e) => {
                      const car = cars.find(c => (c._id || c.id) === e.target.value);
                      setSelectedCar(car || null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  >
                    <option value="">Sélectionner une voiture</option>
                    {cars.map((car) => (
                      <option key={car._id || car.id} value={car._id || car.id}>
                        {car.brand} {car.model} {car.year}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure *
                </label>
                {loadingTimes ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">Chargement des créneaux...</span>
                  </div>
                ) : availableTimes.length === 0 && appointmentDate ? (
                  <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50">
                    <p className="text-sm text-red-600">Aucun créneau disponible pour cette date</p>
                  </div>
                ) : (
                  <>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                      disabled={!appointmentDate || availableTimes.length === 0}
                    >
                      <option value="">Sélectionner une heure</option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {unavailableTimes.length > 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-medium text-yellow-800 mb-1">
                          Créneaux non disponibles pour cette date :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unavailableTimes.map((time) => (
                            <span
                              key={time}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleCreateAppointment}
                disabled={isCreating || !selectedCar || !appointmentDate || !appointmentTime}
                className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Création...' : 'Confirmer'}
              </button>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedWorkshop(null);
                  setSelectedCar(null);
                  setAppointmentDate('');
                  setAppointmentTime('');
                  setError('');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* My Appointments Section */}
      {activeTab === 'my-appointments' && (
        <div>
          {/* Filter Buttons */}
          <div className="mb-6 flex gap-4 bg-white rounded-2xl shadow-lg p-2 border border-gray-200">
            <button
              onClick={() => {
                setAppointmentFilter('accepted');
                setNewNotifications(prev => ({ ...prev, accepted: false }));
              }}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative ${
                appointmentFilter === 'accepted'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Acceptés</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                appointmentFilter === 'accepted' ? 'bg-white/30 text-white' : 'bg-green-100 text-green-700'
              }`}>
                {myAppointments.filter(a => a.status === 'accepted').length}
              </span>
              {newNotifications.accepted && appointmentFilter !== 'accepted' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            
            <button
              onClick={() => {
                setAppointmentFilter('en_cours');
                setNewNotifications(prev => ({ ...prev, en_cours: false }));
              }}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative ${
                appointmentFilter === 'en_cours'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>En cours</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                appointmentFilter === 'en_cours' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {myAppointments.filter(a => a.status === 'en_cours').length}
              </span>
              {newNotifications.en_cours && appointmentFilter !== 'en_cours' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            
            <button
              onClick={() => {
                setAppointmentFilter('finish');
                setNewNotifications(prev => ({ ...prev, finish: false }));
              }}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative ${
                appointmentFilter === 'finish'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Terminés</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                appointmentFilter === 'finish' ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-700'
              }`}>
                {myAppointments.filter(a => a.status === 'finish').length}
              </span>
              {newNotifications.finish && appointmentFilter !== 'finish' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
          </div>

          {loadingMyAppointments ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : myAppointments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600">Aucun rendez-vous trouvé</p>
            </div>
          ) : myAppointments.filter((appointment: any) => appointment.status === appointmentFilter).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600">Aucun rendez-vous {appointmentFilter === 'accepted' ? 'accepté' : appointmentFilter === 'en_cours' ? 'en cours' : 'terminé'} trouvé</p>
            </div>
          ) : (
        <div className="space-y-4">
              {myAppointments
                .filter((appointment: any) => appointment.status === appointmentFilter)
                .map((appointment: any) => (
                <div key={appointment._id || appointment.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Car Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
                            {appointment.id_car?.brand} {appointment.id_car?.model} {appointment.id_car?.year}
                          </h3>
                          <div className="flex items-center gap-4 mb-3">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(appointment.status)}`}>
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Workshop Information */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Informations de l'atelier</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-gray-600 font-medium">
                              {appointment.id_workshop?.name || 'Atelier'}
                        </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <a href={`tel:${appointment.id_workshop?.phone}`} className="text-teal-600 hover:text-teal-700 font-medium">
                              {appointment.id_workshop?.phone || 'N/A'}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${appointment.id_workshop?.email}`} className="text-teal-600 hover:text-teal-700 font-medium">
                              {appointment.id_workshop?.email || 'N/A'}
                            </a>
                          </div>
                          {appointment.id_workshop?.adr && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-gray-600">{appointment.id_workshop.adr}</span>
                            </div>
                          )}
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

                      {/* Show images and PDF for finished appointments */}
                      {appointment.status === 'finish' && (
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                            Rapport de vérification
                          </h4>
                          
                          {/* Images */}
                          {appointment.images && appointment.images.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-600 mb-2 font-medium">Images ({appointment.images.length})</p>
                              <div className="grid grid-cols-3 gap-3">
                                {appointment.images.map((image: string, index: number) => (
                                  <div key={index} className="relative h-24 rounded-lg overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                    <Image
                                      src={getImageUrl(image) || image}
                                      alt={`Image de vérification ${index + 1}`}
                                      fill
                                      className="object-cover group-hover:scale-105 transition-transform"
                                      unoptimized
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PDF Report */}
                          {appointment.rapport_pdf && (
                            <div>
                              <p className="text-xs text-gray-600 mb-2 font-medium">Rapport PDF</p>
                              <a
                                href={getImageUrl(appointment.rapport_pdf) || appointment.rapport_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                                Voir le rapport PDF
                        </a>
                      </div>
                          )}

                          {(!appointment.images || appointment.images.length === 0) && !appointment.rapport_pdf && (
                            <p className="text-sm text-gray-500 italic">Aucun fichier disponible pour le moment</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}
    </div>
  );
}
