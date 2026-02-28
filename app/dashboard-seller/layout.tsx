'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { getImageUrl } from "@/utils/backend";
import { io, Socket } from 'socket.io-client';

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rdvNotificationCount, setRdvNotificationCount] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showExpiredRdvModal, setShowExpiredRdvModal] = useState(false);
  const [expiredRdvs, setExpiredRdvs] = useState<any[]>([]);
  const [showPriceWarningModal, setShowPriceWarningModal] = useState(false);
  const [warningCarId, setWarningCarId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, userType, userRole, isLoading, isAuthenticated, logout } = useUser();

  useEffect(() => {
    // Security checks
    if (isLoading) return; // Wait for auth to initialize

    // Check if user is authenticated
    if (!isAuthenticated || !token || !user) {
      router.push('/login');
      return;
    }

    // Check if user is a regular client (not admin, not workshop)
    if (userType !== 'user' || userRole === 'admin') {
      logout();
      router.push('/');
      return;
    }

    // Check if user account is activated
    if (!user.status) {
      logout();
      router.push('/login');
      return;
    }

    // Fetch profile image
    if (user && (user._id || user.id)) {
      fetchProfileImage();
    }

    // Check expired appointments when user enters dashboard
    if (user && token && userType === 'user' && userRole !== 'admin') {
      checkExpiredAppointments();
    }
  }, [isLoading, isAuthenticated, token, user, userType, userRole, router, logout]);

  // Fetch profile image
  const fetchProfileImage = async () => {
    if (!user?._id && !user?.id) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userId = user._id || user.id;
      const res = await fetch(`/api/user-image/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.userImage) {
          setProfileImage(data.userImage.image);
        } else {
          setProfileImage(null);
        }
      } else {
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
      setProfileImage(null);
    }
  };

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      setProfileImage(event.detail.image);
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, []);

  // Check expired appointments
  const checkExpiredAppointments = async () => {
    if (!user || !token) return;

    try {
      const res = await fetch('/api/rdv-workshop/check-expired-seller', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.deletedAppointments && data.deletedAppointments.length > 0) {
          setExpiredRdvs(data.deletedAppointments);
          setShowExpiredRdvModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking expired appointments:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user || !user._id) return;

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
          setNotifications(filteredNotifications);
          setUnreadCount(filteredNotifications.length);
          
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
      console.error('Error fetching notifications:', error);
    }
  };

  // Initialize Socket.io connection
  useEffect(() => {
    if (user && user._id && userType === 'user') {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                        process.env.NEXT_PUBLIC_URLBACKEND || 
                        'http://localhost:8001';
      
      const newSocket = io(backendUrl, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected for user');
        // Join user room
        const userId = user._id || user.id;
        if (userId) {
          newSocket.emit('join_user', userId);
        }
      });

      newSocket.on('new_notification', (data: any) => {
        console.log('New notification received:', data);
        // Handle different data structures from backend
        const notification = data?.notification || data;
        
        if (notification && (notification.id || notification._id)) {
          // Check if notification already exists to avoid duplicates
          setNotifications((prev) => {
            const notificationId = notification._id || notification.id;
            const exists = prev.some((n: any) => 
              (n._id || n.id) === notificationId
            );
            if (exists) return prev;
            // Filter out "other" type notifications
            if (notification.type === 'other') return prev;
            // Add new notification at the beginning
            return [notification, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
          
          // Check if it's a price warning notification
          if (notification.type === 'car_price_warning' || notification.message?.includes('corriger le prix')) {
            const carId = notification.carId || data?.carId;
            if (carId) {
              setWarningCarId(carId);
              setWarningMessage(notification.message || 'Veuillez corriger le prix de votre véhicule dans les 24 heures, sinon il sera supprimé.');
              setShowPriceWarningModal(true);
            }
          }
          
          // Update RDV count if it's an RDV notification
          const isRdvNotification = 
            notification.type === 'rdv_workshop' || 
            notification.type === 'new_rdv_workshop' ||
            notification.type === 'done_rdv_workshop' ||
            notification.type === 'cancel_rdv_workshop' ||
            notification.type === 'accept_rdv' ||
            notification.message?.toLowerCase().includes('rendez-vous') ||
            notification.message?.toLowerCase().includes('rdv');
          
          if (isRdvNotification) {
            setRdvNotificationCount((prev) => prev + 1);
          }
        }
        // Also refresh from API to ensure consistency
        fetchNotifications();
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      setSocket(newSocket);

      return () => {
        const userId = user._id || user.id;
        if (userId) {
          newSocket.emit('leave_user', userId);
        }
        newSocket.close();
      };
    }
  }, [user, userType]);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (user && user._id && userType === 'user') {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, userType]);

  // Check for price warning notifications when notifications are loaded
  useEffect(() => {
    if (notifications.length > 0) {
      const priceWarning = notifications.find((notif: any) => 
        notif.type === 'car_price_warning' || 
        notif.message?.includes('corriger le prix')
      );
      
      if (priceWarning && !showPriceWarningModal) {
        // Try to extract carId from notification data
        const carId = priceWarning.carId || (priceWarning as any).carId;
        if (carId) {
          setWarningCarId(carId);
          setWarningMessage(priceWarning.message || 'Veuillez corriger le prix de votre véhicule dans les 24 heures, sinon il sera supprimé.');
          setShowPriceWarningModal(true);
        }
      }
    }
  }, [notifications, showPriceWarningModal]);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`/api/notification/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchNotifications();
        // Dispatch event to update notifications in child components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationUpdated'));
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/notification/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchNotifications();
        // Dispatch event to update notifications in child components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationUpdated'));
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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

  // Don't render dashboard if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null;
  }

  const navItems = [
    { name: 'Tableau de bord', icon: 'dashboard', path: '/dashboard-seller' },
    { name: 'Ajouter une voiture', icon: 'add-car', path: '/dashboard-seller/add-car' },
    { name: 'Mes voitures', icon: 'car', path: '/dashboard-seller/my-cars' },
    { name: 'Rendez-vous', icon: 'appointment', path: '/dashboard-seller/appointments' },
    { name: 'Messages', icon: 'message', path: '/dashboard-seller/messages' },
    { name: 'Statistiques', icon: 'stats', path: '/dashboard-seller/statistics' },
    { name: 'Profil', icon: 'profile', path: '/dashboard-seller/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0`}></div>
      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen text-white transition-all duration-300 flex flex-col overflow-hidden z-50`}>
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="relative w-full h-full">
            <Image
              src="/images/car1.png"
              alt="Sidebar Background"
              fill
              className="object-contain object-center"
              priority
              style={{ transform: 'scale(1.5)', objectPosition: 'center center' }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/95 via-teal-800/90 to-cyan-900/95"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Dashboard Header with Animation */}
          <div className="p-6 border-b border-white/20 backdrop-blur-sm">
            <div className={`flex items-center justify-center gap-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative w-12 h-12 flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/30 animate-pulse">
                <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {sidebarOpen && (
                <div className="animate-slide-in">
                  <h2 className="text-lg font-bold font-[var(--font-poppins)] text-white drop-shadow-lg">Espace Vendeur</h2>
                  <p className="text-xs text-teal-200 mt-0.5">Gérez vos véhicules</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard-seller' && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                      : 'text-teal-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                  }`}
                >
                  <div className="w-5 h-5 flex-shrink-0">
                    {item.icon === 'dashboard' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    )}
                    {item.icon === 'add-car' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'car' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                      </svg>
                    )}
                    {item.icon === 'appointment' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'message' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                    )}
                    {item.icon === 'stats' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                    )}
                    {item.icon === 'profile' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {sidebarOpen && (
                    <span className="text-sm font-medium flex items-center gap-2 flex-1">
                      {item.name}
                      {item.icon === 'appointment' && rdvNotificationCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold ml-auto">
                          {rdvNotificationCount > 9 ? '9+' : rdvNotificationCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Earnings Card */}
          {sidebarOpen && (
            <div className="p-4 border-t border-white/20 backdrop-blur-sm">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-xl">
                <p className="text-2xl font-bold mb-1 text-white drop-shadow-md">8,450,000 DA</p>
                <p className="text-xs text-teal-100">Revenus totaux</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 hover:bg-gray-100 rounded-xl relative transition-all group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 font-[var(--font-poppins)]">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <p>Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <div
                              key={notification._id || notification.id}
                              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.is_read ? 'bg-blue-50/50' : ''
                              }`}
                              onClick={async () => {
                                // Mark as read when clicked
                                if (!notification.is_read) {
                                  await markAsRead(notification._id || notification.id);
                                }
                                // Navigate based on type
                                if (notification.type === 'done_rdv_workshop' || notification.type === 'cancel_rdv_workshop' || notification.type === 'rdv_workshop') {
                                  router.push('/dashboard-seller/appointments?tab=my-appointments');
                                  setShowNotifications(false);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  !notification.is_read ? 'bg-blue-500' : 'bg-transparent'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 mb-1">
                                    {notification.id_sender?.name || notification.id_sender?.firstName 
                                      ? (notification.id_sender.name || `${notification.id_sender.firstName} ${notification.id_sender.lastName || ''}`)
                                      : 'Atelier'}
                                  </p>
                                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {profileImage ? (
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-teal-500 shadow-lg hover:shadow-xl transition-shadow">
                    <Image
                      src={getImageUrl(profileImage) || '/images/default-avatar.png'}
                      alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-teal-600 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                    {user ? (
                      user.firstName ? (
                        `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`
                      ) : user.name ? (
                        user.name.substring(0, 2).toUpperCase()
                      ) : 'U'
                    ) : 'U'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user ? (user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.name || 'Utilisateur') : 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'Email'}
                  </p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 hidden md:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      {/* Switch to Buyer Mode */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Passer en mode Acheteur
                      </button>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      {/* Logout */}
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Expired RDV Modal */}
      {showExpiredRdvModal && expiredRdvs.length > 0 && (
        <>
          <div
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => setShowExpiredRdvModal(false)}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 animate-slideUp">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                        Rendez-vous expirés supprimés
                      </h2>
                      <p className="text-sm text-orange-50 mt-1">
                        {expiredRdvs.length} rendez-vous {expiredRdvs.length > 1 ? 'ont été' : 'a été'} automatiquement supprimé{expiredRdvs.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExpiredRdvModal(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {expiredRdvs.map((rdv, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{rdv.carName}</p>
                          <p className="text-sm text-gray-600 mb-1">Atelier: {rdv.workshopName}</p>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(rdv.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} à {rdv.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Les rendez-vous dont la date est passée et qui sont en statut "En attente" ou "Accepté" sont automatiquement supprimés. 
                      Les ateliers concernés ont été notifiés de cette annulation.
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowExpiredRdvModal(false);
                    setExpiredRdvs([]);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Price Warning Modal */}
      {showPriceWarningModal && warningCarId && (
        <>
          <div
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => setShowPriceWarningModal(false)}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 animate-slideUp">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                        ⚠️ Avertissement Important
                      </h2>
                      <p className="text-sm text-orange-50 mt-1">
                        Action requise dans les 24 heures
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPriceWarningModal(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                  <p className="text-gray-800 font-semibold mb-2">
                    {warningMessage}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vous devez corriger le prix de votre véhicule dans les <strong>24 heures</strong>, sinon il sera automatiquement supprimé de la plateforme.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPriceWarningModal(false);
                      // Navigate to my-cars page with carId in URL to trigger edit modal
                      router.push(`/dashboard-seller/my-cars?editCar=${warningCarId}`);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Corriger le Prix
                  </button>
                  <button
                    onClick={() => setShowPriceWarningModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Plus tard
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
