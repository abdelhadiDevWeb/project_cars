'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { getImageUrl, getBackendUrl } from "@/utils/backend";
import { io, Socket } from 'socket.io-client';

export default function WorkshopDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, userType, userRole, isLoading, isAuthenticated, logout } = useUser();

  // Check if required prices are set based on workshop type, redirect to profile if not
  useEffect(() => {
    if (!isLoading && user && userType === 'workshop' && user.workshopType) {
      let shouldRedirect = false;
      
      if (user.workshopType === 'mechanic') {
        // For mechanic: need price_visit_mec
        if (user.price_visit_mec === null || user.price_visit_mec === undefined || user.price_visit_mec === 0) {
          shouldRedirect = true;
        }
      } else if (user.workshopType === 'paint_vehicle') {
        // For paint_vehicle: need price_visit_paint
        if (user.price_visit_paint === null || user.price_visit_paint === undefined || user.price_visit_paint === 0) {
          shouldRedirect = true;
        }
      } else if (user.workshopType === 'mechanic_paint_inspector') {
        // For mechanic_paint_inspector: need both prices
        if ((user.price_visit_mec === null || user.price_visit_mec === undefined || user.price_visit_mec === 0) ||
            (user.price_visit_paint === null || user.price_visit_paint === undefined || user.price_visit_paint === 0)) {
          shouldRedirect = true;
        }
      }
      
      if (shouldRedirect && typeof window !== 'undefined' && !pathname?.includes('/profile')) {
        router.push('/dashboard-workshop/profile');
      }
    }
  }, [user, isLoading, router, pathname, userType]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !token || !user) {
      router.push('/login');
      return;
    }
    if (userType !== 'workshop' || userRole === 'admin') {
      logout();
      router.push('/');
      return;
    }
    if (!user.status) {
      logout();
      router.push('/login');
      return;
    }
    if (user && user._id) {
      fetchProfileImage();
    }
  }, [isLoading, isAuthenticated, token, user, userType, userRole, router, logout]);

  const fetchProfileImage = async () => {
    if (!user?._id) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const userId = user._id;
      const res = await fetch(`/api/user-image/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      setProfileImage(event.detail.image);
    };
    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!user || !user._id) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/notification', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.notifications) {
          const filteredNotifications = data.notifications.filter((notif: any) => notif.type !== 'other');
          setNotifications(filteredNotifications);
          setUnreadCount(filteredNotifications.filter((n: any) => !n.is_read).length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user && user._id && userType === 'workshop') {
      const backendUrl = getBackendUrl();
      const token = localStorage.getItem('token');
      if (!token) return;
      const newSocket = io(backendUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      newSocket.on('connect', () => {
        console.log('Socket connected for workshop');
        const userId = user._id;
        if (userId) {
          newSocket.emit('join_workshop', userId);
        }
      });
      newSocket.on('new_notification', (data: any) => {
        // Handle different data structures from backend
        // Backend sends: { id, id_sender, message, type, is_read, createdAt }
        // Or sometimes: { notification: { ... } }
        const notification = data?.notification || data;
        
        if (notification && (notification.id || notification._id)) {
          const notificationId = notification._id || notification.id;
          
          // Check if notification already exists before adding
          setNotifications((prev) => {
            const exists = prev.some((n: any) => {
              const nId = n._id || n.id;
              return nId === notificationId;
            });
            
            if (exists) {
              console.log('⚠️ Notification already exists, skipping duplicate:', notificationId);
              return prev;
            }
            
            if (notification.type === 'other') return prev;
            
            // Add notification with proper structure
            const newNotification = {
              _id: notification._id || notification.id,
              id: notification.id || notification._id,
              id_sender: notification.id_sender,
              message: notification.message,
              type: notification.type,
              is_read: notification.is_read || false,
              createdAt: notification.createdAt || new Date(),
            };
            
            console.log('✅ New notification added via Socket.IO:', newNotification.id);
            return [newNotification, ...prev];
          });
          
          // Only increment unread count if notification is not read
          if (!notification.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
          
          // Don't call fetchNotifications() here to avoid duplicates
          // The notification is already added via Socket.IO in real-time
        }
      });
      newSocket.on('new_appointment', (data: any) => {
        fetchNotifications();
      });
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      setSocket(newSocket);
      return () => {
        const userId = user._id;
        if (userId) {
          newSocket.emit('leave_workshop', userId);
        }
        newSocket.close();
      };
    }
  }, [user, userType]);

  useEffect(() => {
    if (user && user._id && userType === 'workshop') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, userType]);

  const fetchTodayAppointmentsCount = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch('/api/workshop-stats/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.appointments) {
          // Count appointments that are not finished (accepted, en_cours, en_attente)
          const count = data.appointments.filter((apt: any) => apt.status !== 'finish').length;
          setTodayAppointmentsCount(count);
        }
      }
    } catch (error) {
      console.error('Error fetching today appointments count:', error);
    }
  };

  useEffect(() => {
    if (user && token && userType === 'workshop') {
      fetchTodayAppointmentsCount();
      // Refresh every 30 seconds
      const interval = setInterval(fetchTodayAppointmentsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token, userType]);

  // Listen for appointment status changes
  useEffect(() => {
    const handleAppointmentStatusChange = () => {
      fetchTodayAppointmentsCount();
    };
    window.addEventListener('appointmentStatusChanged', handleAppointmentStatusChange);
    return () => {
      window.removeEventListener('appointmentStatusChanged', handleAppointmentStatusChange);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/notification/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        fetchNotifications();
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        fetchNotifications();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationUpdated'));
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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

  if (!isAuthenticated || !user) {
    return null;
  }

  const navItems = [
    { name: 'Tableau de bord', icon: 'dashboard', path: '/dashboard-workshop' },
    { name: 'Rendez-vous', icon: 'appointment', path: '/dashboard-workshop/appointments' },
    { name: "Aujourd'hui", icon: 'today', path: '/dashboard-workshop/today' },
    { name: 'Factures', icon: 'facture', path: '/dashboard-workshop/factures' },
    { name: 'Statistiques', icon: 'stats', path: '/dashboard-workshop/statistics' },
    { name: 'Profil', icon: 'profile', path: '/dashboard-workshop/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0`}></div>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen text-white transition-all duration-300 flex flex-col overflow-hidden z-50`}>
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-indigo-900/95"></div>
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-6 border-b border-white/20 backdrop-blur-sm">
            <div className={`flex items-center justify-center gap-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative w-12 h-12 flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/30 animate-pulse">
                <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              {sidebarOpen && (
                <div>
                  <h2 className="text-lg font-bold font-[var(--font-poppins)] text-white drop-shadow-lg">Espace Atelier</h2>
                  <p className="text-xs text-blue-200 mt-0.5">Gérez vos rendez-vous</p>
                </div>
              )}
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard-workshop' && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                  }`}
                >
                  <div className="w-5 h-5 flex-shrink-0">
                    {item.icon === 'dashboard' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    )}
                    {item.icon === 'appointment' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'today' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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
                    {item.icon === 'facture' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {sidebarOpen && (
                    <span className="text-sm font-medium flex items-center gap-2 flex-1">
                      {item.name}
                      {item.icon === 'appointment' && unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold ml-auto">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      {item.icon === 'today' && todayAppointmentsCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold ml-auto">
                          {todayAppointmentsCount > 9 ? '9+' : todayAppointmentsCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {sidebarOpen && (
            <div className="p-4 border-t border-white/20 backdrop-blur-sm">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-xl">
                <p className="text-lg font-bold mb-1 text-white drop-shadow-md">
                  {user.name || 'Atelier'}
                </p>
                <p className="text-xs text-blue-100">
                  {user.price_visite ? `${user.price_visite} DA/visite` : 'Prix non défini'}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden relative">
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
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 hover:bg-gray-100 rounded-xl relative transition-all group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
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
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                                if (!notification.is_read) {
                                  await markAsRead(notification._id || notification.id);
                                }
                                if (notification.type === 'rdv_workshop' || notification.type === 'new_rdv_workshop') {
                                  router.push('/dashboard-workshop/appointments');
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
                                      : 'Client'}
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
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {profileImage ? (
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                    <Image
                      src={getImageUrl(profileImage) || '/images/default-avatar.png'}
                      alt={user?.name || 'Atelier'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AT'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || 'Atelier'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'Email'}
                  </p>
                  {user?.workshopType && (
                    <p className="text-xs font-medium text-teal-600 mt-0.5">
                      {user.workshopType === 'mechanic' ? 'Mécanique' : 
                       user.workshopType === 'paint_vehicle' ? 'Peinture véhicule' : 
                       user.workshopType === 'mechanic_paint_inspector' ? 'Mécanique & Peinture Inspecteur' : 
                       user.workshopType}
                    </p>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-400 hidden md:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
