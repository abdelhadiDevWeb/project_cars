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
  type?: string; // 'mechanic', 'paint_vehicle', or 'mechanic_paint_inspector'
  certifie?: boolean;
  price_visit_mec?: number | null;
  price_visit_paint?: number | null;
  averageRating?: number; // Average rating from rates
  totalRatings?: number; // Total number of ratings
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
  const [appointmentFilter, setAppointmentFilter] = useState<'en_attente' | 'accepted' | 'en_cours' | 'finish'>('en_attente');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rdvNotificationCount, setRdvNotificationCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState<{
    en_attente: boolean;
    accepted: boolean;
    en_cours: boolean;
    finish: boolean;
  }>({
    en_attente: false,
    accepted: false,
    en_cours: false,
    finish: false,
  });
  const [addressFilter, setAddressFilter] = useState('');

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
            // Filter workshops: only show those with at least one price defined
            const filteredWorkshops = data.workshops.filter((workshop: Workshop) => {
              const hasMecPrice = workshop.price_visit_mec !== null && workshop.price_visit_mec !== undefined && workshop.price_visit_mec > 0;
              const hasPaintPrice = workshop.price_visit_paint !== null && workshop.price_visit_paint !== undefined && workshop.price_visit_paint > 0;
              return hasMecPrice || hasPaintPrice;
            });
            
            // Sort workshops: prioritize those with both prices, then by name
            const sortedWorkshops = filteredWorkshops.sort((a: Workshop, b: Workshop) => {
              const aHasBoth = (a.price_visit_mec && a.price_visit_mec > 0) && (a.price_visit_paint && a.price_visit_paint > 0);
              const bHasBoth = (b.price_visit_mec && b.price_visit_mec > 0) && (b.price_visit_paint && b.price_visit_paint > 0);
              
              if (aHasBoth && !bHasBoth) return -1;
              if (!aHasBoth && bHasBoth) return 1;
              return a.name.localeCompare(b.name);
            });
            setWorkshops(sortedWorkshops);
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

  // Fetch user's cars (filtered by selected workshop if one is selected)
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

        // If a workshop is selected, filter out cars that already have appointments with this workshop
        const url = selectedWorkshop 
          ? `/api/car/my-cars?excludeWorkshop=${selectedWorkshop._id || selectedWorkshop.id}`
          : '/api/car/my-cars';

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.cars) {
            setCars(data.cars);
            // Reset selected car if it's no longer in the filtered list
            if (selectedCar) {
              const carStillAvailable = data.cars.some((car: Car) => 
                (car._id || car.id) === (selectedCar._id || selectedCar.id)
              );
              if (!carStillAvailable) {
                setSelectedCar(null);
              }
            }
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
  }, [user, router, selectedWorkshop]);

  // Fetch RDV notifications count
  const fetchRdvNotifications = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/notification', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.notifications) {
          // Filter out notifications with type "other"
          const filteredNotifications = data.notifications.filter((notif: any) => notif.type !== 'other');
          
          // Count RDV-specific notifications
          const rdvNotifications = filteredNotifications.filter((notif: any) => 
            notif.type === 'rdv_workshop' || 
            notif.type === 'new_rdv_workshop' ||
            notif.type === 'done_rdv_workshop' ||
            notif.type === 'cancel_rdv_workshop' ||
            notif.type === 'accept_rdv' ||
            notif.message?.toLowerCase().includes('rendez-vous') ||
            notif.message?.toLowerCase().includes('rdv')
          );
          setRdvNotificationCount(rdvNotifications.length);
        }
      }
    } catch (error) {
      console.error('Error fetching RDV notifications:', error);
    }
  };

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
      fetchRdvNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        fetchRdvNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, router]);

  // Listen for notification updates from layout
  useEffect(() => {
    const handleNotificationUpdate = () => {
      fetchRdvNotifications();
    };

    window.addEventListener('notificationUpdated', handleNotificationUpdate);
    return () => {
      window.removeEventListener('notificationUpdated', handleNotificationUpdate);
    };
  }, []);

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
      
      // Check if it's an RDV notification
      const isRdvNotification = 
        data.type === 'rdv_workshop' || 
        data.type === 'new_rdv_workshop' ||
        data.type === 'done_rdv_workshop' ||
        data.type === 'cancel_rdv_workshop' ||
        data.type === 'accept_rdv' ||
        data.message?.toLowerCase().includes('rendez-vous') ||
        data.message?.toLowerCase().includes('rdv');
      
      // Update RDV notification count if it's an RDV notification
      if (isRdvNotification) {
        setRdvNotificationCount((prev) => prev + 1);
        // Also refresh from API to ensure consistency
        fetchRdvNotifications();
      }
      
      // Determine which section this notification is for
      let targetStatus: 'en_attente' | 'accepted' | 'en_cours' | 'finish' | null = null;
      
      if (data.type === 'rdv_workshop' && (data.message?.toLowerCase().includes('demandé') || data.message?.toLowerCase().includes('nouveau'))) {
        targetStatus = 'en_attente';
      } else if (data.type === 'rdv_workshop' || data.type === 'accept_rdv' || data.message?.toLowerCase().includes('accepté') || data.message?.toLowerCase().includes('accept')) {
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
        setLoadingTimes(false);
        return;
      }

      try {
        setLoadingTimes(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingTimes(false);
          return;
        }

        // Start timer for minimum 3 seconds loading
        const startTime = Date.now();
        const minLoadingTime = 3000; // 3 seconds

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

        // Ensure minimum loading time of 3 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      } catch (error) {
        console.error('Error fetching available times:', error);
        // Even on error, show loading for minimum 3 seconds
        const startTime = Date.now();
        const minLoadingTime = 3000;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
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
    setSelectedCar(null); // Reset selected car when changing workshop
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
          className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 relative ${
            activeTab === 'my-appointments'
              ? 'bg-teal-500 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>Mes rendez-vous</span>
          {rdvNotificationCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'my-appointments'
                ? 'bg-white/30 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {rdvNotificationCount > 9 ? '9+' : rdvNotificationCount}
            </span>
          )}
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
          {/* Address Filter */}
          {!loadingWorkshops && workshops.length > 0 && (
            <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
              <label htmlFor="address-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrer par adresse
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="address-filter"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                  placeholder="Rechercher par adresse (ex: Alger, Oran, Constantine...)"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {addressFilter && (
                  <button
                    onClick={() => setAddressFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {addressFilter && (
                <p className="mt-2 text-sm text-gray-600">
                  {workshops.filter((w) => 
                    w.adr && w.adr.toLowerCase().includes(addressFilter.toLowerCase())
                  ).length} atelier(s) trouvé(s)
                </p>
              )}
            </div>
          )}

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
        <>
          {addressFilter && workshops.filter((w) => 
            w.adr && w.adr.toLowerCase().includes(addressFilter.toLowerCase())
          ).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600 mb-2">Aucun atelier trouvé pour cette adresse</p>
              <button
                onClick={() => setAddressFilter('')}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Réinitialiser le filtre
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops
                .filter((workshop) => 
                  !addressFilter || 
                  (workshop.adr && workshop.adr.toLowerCase().includes(addressFilter.toLowerCase()))
                )
                .map((workshop) => (
            <div 
              key={workshop._id || workshop.id} 
              className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden border-2 ${
                ((workshop.price_visit_mec && workshop.price_visit_mec > 0) || (workshop.price_visit_paint && workshop.price_visit_paint > 0))
                  ? 'border-teal-500 hover:border-teal-600' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Decorative Top Border */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                ((workshop.price_visit_mec && workshop.price_visit_mec > 0) || (workshop.price_visit_paint && workshop.price_visit_paint > 0))
                  ? 'bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500' 
                  : 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300'
              }`}></div>

              <div className="p-4 flex flex-col flex-1">
                {/* Header Section */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar with gradient */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                      {workshop.name.substring(0, 2).toUpperCase()}
                    </div>
                    {workshop.certifie && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-teal-500 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name and Type */}
                    <div className="flex flex-col gap-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/workshops/${workshop._id || workshop.id}`}
                          className="text-base font-bold text-gray-900 font-[var(--font-poppins)] truncate group-hover:text-teal-600 transition-colors hover:underline"
                        >
                          {workshop.name}
                        </Link>
                        {workshop.certifie && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md text-xs font-bold shadow-sm flex-shrink-0">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Certifié
                          </span>
                        )}
                      </div>
                      {workshop.type && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-md text-xs font-semibold border border-blue-200 w-fit">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {workshop.type === 'mechanic' ? 'Mécanique' : 
                           workshop.type === 'paint_vehicle' ? 'Peinture véhicule' : 
                           workshop.type === 'mechanic_paint_inspector' ? 'Mécanique & Peinture' : 
                           workshop.type}
                        </span>
                      )}
                      {/* Rating Display */}
                      {workshop.averageRating !== undefined && workshop.averageRating > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-3.5 h-3.5 ${star <= Math.round(workshop.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {workshop.averageRating.toFixed(1)}
                          </span>
                          {workshop.totalRatings && workshop.totalRatings > 0 && (
                            <span className="text-xs text-gray-500">
                              ({workshop.totalRatings} avis{workshop.totalRatings > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Location */}
                    {workshop.adr && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2 bg-gray-50 rounded-md px-2 py-1.5 border border-gray-100">
                        <svg className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="break-words text-gray-700 font-medium text-xs leading-tight">{workshop.adr}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-3 space-y-1.5">
                  {workshop.type === 'mechanic' && workshop.price_visit_mec && workshop.price_visit_mec > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-2 rounded-lg shadow-sm border border-teal-400">
                      <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-teal-100 block leading-tight">Mécanique</span>
                        <span className="text-sm leading-tight">{workshop.price_visit_mec} DA</span>
                      </div>
                    </div>
                  )}
                  {workshop.type === 'paint_vehicle' && workshop.price_visit_paint && workshop.price_visit_paint > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-2 rounded-lg shadow-sm border border-teal-400">
                      <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-teal-100 block leading-tight">Peinture</span>
                        <span className="text-sm leading-tight">{workshop.price_visit_paint} DA</span>
                      </div>
                    </div>
                  )}
                  {workshop.type === 'mechanic_paint_inspector' && (
                    <>
                      {workshop.price_visit_mec && workshop.price_visit_mec > 0 && (
                        <div className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-2 rounded-lg shadow-sm border border-teal-400">
                          <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] text-teal-100 block leading-tight">Mécanique</span>
                            <span className="text-sm leading-tight">{workshop.price_visit_mec} DA</span>
                          </div>
                        </div>
                      )}
                      {workshop.price_visit_paint && workshop.price_visit_paint > 0 && (
                        <div className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-2 rounded-lg shadow-sm border border-teal-400">
                          <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] text-teal-100 block leading-tight">Peinture</span>
                            <span className="text-sm leading-tight">{workshop.price_visit_paint} DA</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Contact Information */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 mb-3 space-y-2 border border-gray-200">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <a href={`tel:${workshop.phone}`} className="text-gray-700 hover:text-teal-600 font-medium transition-colors truncate flex-1 text-xs">
                      {workshop.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <a href={`mailto:${workshop.email}`} className="text-gray-700 hover:text-teal-600 font-medium transition-colors truncate flex-1 text-xs">
                      {workshop.email}
                    </a>
                  </div>
                </div>

                {/* Action Button - Customized */}
                <button
                  onClick={() => handleBookAppointment(workshop)}
                  className="relative w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 via-teal-500 to-teal-600 hover:from-teal-600 hover:via-teal-600 hover:to-teal-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 mt-auto overflow-hidden group"
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  {/* Icon */}
                  <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  
                  {/* Text */}
                  <span className="relative z-10">Réserver</span>
                  
                  {/* Arrow icon on hover */}
                  <svg className="w-4 h-4 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

          {/* Booking Modal */}
      {showBookingModal && selectedWorkshop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 my-8">
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
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setAppointmentTime(''); // Reset time when date changes
                  }}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      required
                      disabled={!appointmentDate || availableTimes.length === 0}
                    >
                      <option value="">Sélectionner une heure dans la liste ci-dessous</option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {appointmentTime && (
                      <p className="mt-2 text-sm text-teal-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Heure sélectionnée : <span className="font-bold">{appointmentTime}</span>
                      </p>
                    )}
                    
                    {/* Display available times below the input */}
                    {availableTimes.length > 0 && (
                      <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Créneaux disponibles ({availableTimes.length}) - Cliquez pour sélectionner :
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2">
                          {availableTimes.map((time) => (
                            <button
                              key={time}
                              type="button"
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-2 ${
                                appointmentTime === time
                                  ? 'bg-teal-500 text-white border-teal-600 shadow-md transform scale-105'
                                  : 'bg-white text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 hover:shadow-sm'
                              }`}
                              onClick={() => setAppointmentTime(time)}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display unavailable times */}
                    {unavailableTimes.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-medium text-yellow-800 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Créneaux non disponibles ({unavailableTimes.length}) :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unavailableTimes.map((time) => (
                            <span
                              key={time}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium opacity-75"
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
          {/* Section Header with Badge */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)] flex items-center gap-3">
              Mes rendez-vous
              {myAppointments.length > 0 && (
                <span className="px-3 py-1 bg-teal-500 text-white rounded-full text-sm font-bold">
                  {myAppointments.length}
                </span>
              )}
              {rdvNotificationCount > 0 && (
                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {rdvNotificationCount > 9 ? '9+' : rdvNotificationCount} notification{rdvNotificationCount > 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>
          
          {/* Filter Buttons */}
          <div className="mb-6 flex gap-4 bg-white rounded-2xl shadow-lg p-2 border border-gray-200">
            <button
              onClick={() => {
                setAppointmentFilter('en_attente');
                setNewNotifications(prev => ({ ...prev, en_attente: false }));
              }}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative ${
                appointmentFilter === 'en_attente'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>En attente</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                appointmentFilter === 'en_attente' ? 'bg-white/30 text-white' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {myAppointments.filter(a => a.status === 'en_attente').length}
              </span>
              {newNotifications.en_attente && appointmentFilter !== 'en_attente' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            
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
              <p className="text-gray-600">Aucun rendez-vous {appointmentFilter === 'en_attente' ? 'en attente' : appointmentFilter === 'accepted' ? 'accepté' : appointmentFilter === 'en_cours' ? 'en cours' : 'terminé'} trouvé</p>
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
