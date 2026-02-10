'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { io, Socket } from 'socket.io-client';
import { getImageUrl } from "@/utils/backend";

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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

    // Check if user is a workshop
    if (userType !== 'workshop') {
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
  }, [isLoading, isAuthenticated, token, user, userType, router, logout]);

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
          // Backend already filters by is_read: false, so we can use them directly
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (user && user._id && userType === 'workshop') {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, userType]);

  // Setup Socket.IO connection
  useEffect(() => {
    if (!user || !user._id || userType !== 'workshop') return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      process.env.NEXT_PUBLIC_URLBACKEND || 
                      'http://localhost:8001';
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      // Join workshop room
      newSocket.emit('join_workshop', user._id || user.id);
    });

    newSocket.on('new_appointment', (data) => {
      console.log('New appointment received:', data);
      // Refresh notifications
      fetchNotifications();
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_workshop', user._id || user.id);
        newSocket.disconnect();
      }
    };
  }, [user, userType, router]);

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
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    { name: 'Tableau de bord', icon: 'dashboard', path: '/dashboard-workshop' },
    { name: 'Liste du jour', icon: 'today', path: '/dashboard-workshop/today' },
    { name: 'Rendez-vous', icon: 'appointment', path: '/dashboard-workshop/appointments' },
    { name: 'Statistiques', icon: 'stats', path: '/dashboard-workshop/statistics' },
    { name: 'Profil', icon: 'profile', path: '/dashboard-workshop/profile' },
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-indigo-900/95"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Dashboard Header with Animation */}
          <div className="p-6 border-b border-white/20 backdrop-blur-sm">
            <div className={`flex items-center justify-center gap-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative w-12 h-12 flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/30 animate-pulse">
                <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              {sidebarOpen && (
                <div className="animate-slide-in">
                  <h2 className="text-lg font-bold font-[var(--font-poppins)] text-white drop-shadow-lg">Espace Atelier</h2>
                  <p className="text-xs text-blue-200 mt-0.5">Gérez vos rendez-vous</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
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
                    {item.icon === 'today' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Earnings Card */}
          {sidebarOpen && (
            <div className="p-4 border-t border-white/20 backdrop-blur-sm">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-xl">
                <p className="text-2xl font-bold mb-1 text-white drop-shadow-md">1,245</p>
                <p className="text-xs text-blue-100">Vérifications effectuées</p>
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
                <svg className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                // Mark as read when clicked
                                if (!notification.is_read) {
                                  await markAsRead(notification._id || notification.id);
                                }
                                // Navigate based on type
                                if (notification.type === 'rdv_workshop') {
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
                                    {notification.id_sender?.firstName && notification.id_sender?.lastName
                                      ? `${notification.id_sender.firstName} ${notification.id_sender.lastName}`
                                      : notification.id_sender?.name || 'Utilisateur'}
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
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg">
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
                    {user ? (
                      user.name ? (
                        user.name.substring(0, 2).toUpperCase()
                      ) : 'W'
                    ) : 'W'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user ? (user.name || 'Atelier') : 'Atelier'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'Email'}
                  </p>
                  {user?.type && (
                    <p className="text-xs text-blue-600 font-medium mt-0.5">
                      {user.type === 'mechanic' ? 'Mécanicien' : 'Technicien en carrosserie automobile'}
                    </p>
                  )}
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
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
    </div>
  );
}
