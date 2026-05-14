'use client';

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { haversineKm, normalizeRegion } from "@/utils/geoDistance";
import SellerWorkshopBookCard from "./SellerWorkshopBookCard";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getImageUrl } from "@/utils/backend";
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '@/utils/backend';
import { useT } from "@/utils/i18n";

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
  locationLat?: number | null;
  locationLng?: number | null;
  locationRegion?: string | null;
  real_time?: boolean;
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
  const t = useT();
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
  const [myRdvWorkshopFilter, setMyRdvWorkshopFilter] = useState('');
  const [workshopSection, setWorkshopSection] = useState<'nearest' | 'accepted' | 'other'>('nearest');

  const addressFiltered = useMemo(() => {
    const q = addressFilter.trim().toLowerCase();
    return workshops.filter((w) => !q || (w.name && w.name.toLowerCase().includes(q)) || (w.adr && w.adr.toLowerCase().includes(q)));
  }, [workshops, addressFilter]);

  const acceptedWorkshopIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of myAppointments) {
      if (String(a.status) !== "accepted") continue;
      const iw = a.id_workshop;
      if (iw && typeof iw === "object") {
        const id = String((iw as { _id?: string })._id || (iw as { id?: string }).id || "");
        if (id) s.add(id);
      } else if (iw) {
        s.add(String(iw));
      }
    }
    return s;
  }, [myAppointments]);

  const hasLocation = (w: Workshop) =>
    typeof w.locationLat === "number" && typeof w.locationLng === "number";

  const nearestSorted = useMemo(() => {
    const sellerR = normalizeRegion(user?.locationRegion ?? null);
    const ulat = user?.locationLat;
    const ulng = user?.locationLng;
    const distKm = (w: Workshop): number | null => {
      if (ulat == null || ulng == null) return null;
      if (!hasLocation(w)) return null;
      return haversineKm(ulat, ulng, w.locationLat!, w.locationLng!);
    };
    return addressFiltered
      .filter((w) => hasLocation(w))
      .sort((a, b) => {
        const aMatch = !!(sellerR && normalizeRegion(a.locationRegion ?? undefined) === sellerR);
        const bMatch = !!(sellerR && normalizeRegion(b.locationRegion ?? undefined) === sellerR);
        if (sellerR) {
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
        }
        const da = distKm(a);
        const db = distKm(b);
        if (da != null && db != null && da !== db) return da - db;
        if (da != null && db == null) return -1;
        if (da == null && db != null) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [addressFiltered, user]);

  const acceptedWorkshops = useMemo(
    () =>
      addressFiltered
        .filter((w) => !!w.real_time)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [addressFiltered],
  );

  const otherWorkshops = useMemo(() => {
    const nearestIds = new Set(nearestSorted.map((w) => String(w._id || w.id)));
    const acceptedIds = new Set(acceptedWorkshops.map((w) => String(w._id || w.id)));
    return addressFiltered
      .filter((w) => {
        const wId = String(w._id || w.id);
        return !nearestIds.has(wId) && !acceptedIds.has(wId);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addressFiltered, nearestSorted, acceptedWorkshops]);

  const workshopDistanceKm = (w: Workshop): number | null => {
    if (user?.locationLat == null || user?.locationLng == null) return null;
    const wlat = w.locationLat;
    const wlng = w.locationLng;
    if (typeof wlat !== "number" || typeof wlng !== "number") return null;
    return haversineKm(user.locationLat, user.locationLng, wlat, wlng);
  };

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
        const res = await fetch('/api/workshop/active?fresh=1');
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.workshops) {
            // Show all active workshops (status: true from backend).
            // Sort: workshops with prices first, then by name.
            const sorted = [...data.workshops].sort((a: Workshop, b: Workshop) => {
              const aHasPrice = (a.price_visit_mec && a.price_visit_mec > 0) || (a.price_visit_paint && a.price_visit_paint > 0);
              const bHasPrice = (b.price_visit_mec && b.price_visit_mec > 0) || (b.price_visit_paint && b.price_visit_paint > 0);
              if (aHasPrice && !bHasPrice) return -1;
              if (!aHasPrice && bHasPrice) return 1;
              return a.name.localeCompare(b.name);
            });
            setWorkshops(sorted);
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
      newSocket.emit('join_user', user._id || (user as any).id);
    });

    // Listen for notification of appointment updates
    newSocket.on('new_notification', (data: any) => {
      console.log('New notification received:', data);
      const notification = data?.notification || data;
      
      // Check if it's an RDV notification
      const isRdvNotification = 
        notification?.type === 'rdv_workshop' || 
        notification?.type === 'new_rdv_workshop' ||
        notification?.type === 'done_rdv_workshop' ||
        notification?.type === 'cancel_rdv_workshop' ||
        notification?.type === 'accept_rdv' ||
        notification?.message?.toLowerCase().includes('rendez-vous') ||
        notification?.message?.toLowerCase().includes('rdv');
      
      // Update RDV notification count if it's an RDV notification
      if (isRdvNotification) {
        // Refresh from API to ensure correct count (avoid drift)
        fetchRdvNotifications();
      }
      
      // Determine which section this notification is for
      let targetStatus: 'en_attente' | 'accepted' | 'en_cours' | 'finish' | null = null;
      
      if (notification?.type === 'rdv_workshop' && (notification?.message?.toLowerCase().includes('demandé') || notification?.message?.toLowerCase().includes('nouveau'))) {
        targetStatus = 'en_attente';
      } else if (notification?.type === 'rdv_workshop' || notification?.type === 'accept_rdv' || notification?.message?.toLowerCase().includes('accepté') || notification?.message?.toLowerCase().includes('accept')) {
        targetStatus = 'accepted';
      } else if (notification?.message?.toLowerCase().includes('en cours') || notification?.message?.toLowerCase().includes('commencé')) {
        targetStatus = 'en_cours';
      } else if (notification?.message?.toLowerCase().includes('terminé') || notification?.message?.toLowerCase().includes('finish') || notification?.message?.toLowerCase().includes('fini')) {
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
        newSocket.emit('leave_user', user._id || (user as any).id);
        newSocket.disconnect();
      }
    };
  }, [user]);

  const filteredMyAppointments = myAppointments
    .filter((appointment: any) => appointment.status === appointmentFilter)
    .filter((appointment: any) => {
      const q = myRdvWorkshopFilter.trim().toLowerCase();
      if (!q) return true;
      const workshopName = (appointment.id_workshop?.name || '').toString().toLowerCase();
      const workshopAdr = (appointment.id_workshop?.adr || '').toString().toLowerCase();
      return workshopName.includes(q) || workshopAdr.includes(q);
    });

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
      setError(t("Vous devez avoir au moins une voiture pour prendre un rendez-vous"));
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
      setError(t("Veuillez remplir tous les champs"));
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
        setError(t("Erreur serveur: réponse invalide"));
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

      setSuccess(t("Rendez-vous créé avec succès !"));
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
      setError(t("Erreur de connexion. Veuillez réessayer."));
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
          <p className="mt-4 text-gray-600">{t('Chargement...')}</p>
        </div>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'en_attente': t('En attente'),
      'accepted': t('Accepté'),
      'refused': t('Refusé'),
      'en_cours': t('En cours'),
      'finish': t('Terminé'),
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
          {t('Rendez-vous pour atelier')}
        </h1>
        <p className="text-gray-600">{t('Réservez un rendez-vous avec un atelier pour vérifier votre véhicule')}</p>
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
          {t('Réserver un rendez-vous')}
        </button>
        <button
          onClick={() => setActiveTab('my-appointments')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 relative ${
            activeTab === 'my-appointments'
              ? 'bg-teal-500 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>{t('Mes rendez-vous')}</span>
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
                {t('Filtrer par nom ou adresse')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="address-filter"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                  placeholder={t('Rechercher par nom ou adresse (ex: Atelier ABC, Alger...)')}
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
                  {addressFiltered.length} {t('atelier(s) trouvé(s)')}
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
          <p className="text-gray-600">{t('Aucun atelier disponible pour le moment')}</p>
        </div>
      ) : (
        <>
          {addressFilter && addressFiltered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600 mb-2">{t('Aucun atelier trouvé pour cette adresse')}</p>
              <button
                onClick={() => setAddressFilter('')}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                {t('Réinitialiser le filtre')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {(!user?.locationLat || !user?.locationLng) && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
                  {t("Seller geo hint")}
                </div>
              )}

              {/* Workshop section switcher */}
              <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-200 flex gap-1">
                <button
                  onClick={() => setWorkshopSection('nearest')}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                    workshopSection === 'nearest'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t("SECTION_NEAREST_WORKSHOPS")}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    workshopSection === 'nearest' ? 'bg-white/30 text-white' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {nearestSorted.length}
                  </span>
                </button>

                <button
                  onClick={() => setWorkshopSection('accepted')}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                    workshopSection === 'accepted'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("SECTION_ACCEPTED_WORKSHOPS")}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    workshopSection === 'accepted' ? 'bg-white/30 text-white' : 'bg-green-100 text-green-700'
                  }`}>
                    {acceptedWorkshops.length}
                  </span>
                </button>

                <button
                  onClick={() => setWorkshopSection('other')}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                    workshopSection === 'other'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{t("SECTION_OTHER_WORKSHOPS")}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    workshopSection === 'other' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {otherWorkshops.length}
                  </span>
                </button>
              </div>

              {/* Nearest workshops */}
              {workshopSection === 'nearest' && (
                <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-1">
                    {t("SECTION_NEAREST_WORKSHOPS")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">{t("SECTION_NEAREST_DESC")}</p>
                  {nearestSorted.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("SECTION_EMPTY")}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {nearestSorted.map((workshop) => (
                        <SellerWorkshopBookCard
                          key={`near-${workshop._id || workshop.id}`}
                          workshop={workshop}
                          onBook={handleBookAppointment}
                          t={t}
                          distanceKm={workshopDistanceKm(workshop)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Accepted workshops */}
              {workshopSection === 'accepted' && (
                <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-1">
                    {t("SECTION_ACCEPTED_WORKSHOPS")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">{t("SECTION_ACCEPTED_DESC")}</p>
                  {acceptedWorkshops.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("SECTION_EMPTY")}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {acceptedWorkshops.map((workshop) => (
                        <SellerWorkshopBookCard
                          key={`acc-${workshop._id || workshop.id}`}
                          workshop={workshop}
                          onBook={handleBookAppointment}
                          t={t}
                          distanceKm={workshopDistanceKm(workshop)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Other workshops */}
              {workshopSection === 'other' && (
                <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)] mb-1">
                    {t("SECTION_OTHER_WORKSHOPS")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">{t("SECTION_OTHER_DESC")}</p>
                  {otherWorkshops.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("SECTION_EMPTY")}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {otherWorkshops.map((workshop) => (
                        <SellerWorkshopBookCard
                          key={`oth-${workshop._id || workshop.id}`}
                          workshop={workshop}
                          onBook={handleBookAppointment}
                          t={t}
                          distanceKm={workshopDistanceKm(workshop)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
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
                {t('Réserver un rendez-vous')}
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
              <p className="text-sm text-gray-600 mb-1">{t('Atelier')}</p>
              <p className="font-semibold text-gray-900">{selectedWorkshop.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Sélectionner une voiture')} *
                </label>
                {loadingCars ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-6 w-6 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : cars.length === 0 ? (
                  <p className="text-sm text-red-600">{t("Vous n'avez aucune voiture. Veuillez d'abord ajouter une voiture.")}</p>
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
                    <option value="">{t('Sélectionner une voiture')}</option>
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
                  {t('Date')} *
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
                  {t('Heure')} *
                </label>
                {loadingTimes ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">{t('Chargement des créneaux...')}</span>
                  </div>
                ) : availableTimes.length === 0 && appointmentDate ? (
                  <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50">
                    <p className="text-sm text-red-600">{t('Aucun créneau disponible pour cette date')}</p>
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
                      <option value="">{t('Sélectionner une heure dans la liste ci-dessous')}</option>
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
                        {t('Heure sélectionnée :')} <span className="font-bold">{appointmentTime}</span>
                      </p>
                    )}
                    
                    {/* Display available times below the input */}
                    {availableTimes.length > 0 && (
                      <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('Créneaux disponibles ({n}) - Cliquez pour sélectionner :', { n: availableTimes.length })}
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
                          {t('Créneaux non disponibles ({n}) :', { n: unavailableTimes.length })}
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
                {isCreating ? t('Création...') : t('Confirmer')}
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
                {t('Annuler')}
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
              {t('Mes rendez-vous')}
              {rdvNotificationCount > 0 && (
                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                  {rdvNotificationCount > 9 ? '9+' : rdvNotificationCount}
                </span>
              )}
            </h2>
          </div>

          {/* Filter by workshop name/address */}
          <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('Filtrer par atelier (nom ou adresse)')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={myRdvWorkshopFilter}
                onChange={(e) => setMyRdvWorkshopFilter(e.target.value)}
                placeholder={t('Ex: Atelier ABC, Alger, Oran...')}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              {myRdvWorkshopFilter && (
                <button
                  type="button"
                  onClick={() => setMyRdvWorkshopFilter('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
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
              <span>{t('En attente')}</span>
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
              <span>{t('Acceptés')}</span>
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
              <span>{t('En cours')}</span>
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
              <span>{t('Terminés')}</span>
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
              <p className="text-gray-600">{t('Aucun rendez-vous trouvé')}</p>
            </div>
          ) : filteredMyAppointments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600">
                {t('Aucun rendez-vous {status} trouvé', {
                  status:
                    appointmentFilter === 'en_attente'
                      ? t('en attente')
                      : appointmentFilter === 'accepted'
                        ? t('accepté')
                        : appointmentFilter === 'en_cours'
                          ? t('en cours')
                          : t('terminé'),
                })}
              </p>
            </div>
          ) : (
        <div className="space-y-4">
              {filteredMyAppointments.map((appointment: any) => (
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
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t("Informations de l'atelier")}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-gray-600 font-medium">
                              {appointment.id_workshop?.name || t('Atelier')}
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
                            {t('Rapport de vérification')}
                          </h4>
                          
                          {/* Images */}
                          {appointment.images && appointment.images.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-600 mb-2 font-medium">
                                {t('Images ({n})', { n: appointment.images.length })}
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                {appointment.images.map((image: string, index: number) => (
                                  <div key={index} className="relative h-24 rounded-lg overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                    <Image
                                      src={getImageUrl(image) || image}
                                      alt={t('Image de vérification {n}', { n: index + 1 })}
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
                              <p className="text-xs text-gray-600 mb-2 font-medium">{t('Rapport PDF')}</p>
                              <a
                                href={getImageUrl(appointment.rapport_pdf) || appointment.rapport_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                                {t('Voir le rapport PDF')}
                        </a>
                      </div>
                          )}

                          {(!appointment.images || appointment.images.length === 0) && !appointment.rapport_pdf && (
                            <p className="text-sm text-gray-500 italic">{t('Aucun fichier disponible pour le moment')}</p>
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
