'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const userType = localStorage.getItem('userType');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    // Check if user is admin - if not, redirect to home
    if (userType !== 'user' || userRole !== 'admin') {
      // Clear invalid session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      localStorage.removeItem('userRole');
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Check if user status is true (activated)
      if (!parsedUser.status) {
        router.push('/');
        return;
      }
      
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/');
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }).catch(() => {});
      }
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      localStorage.removeItem('userRole');
      // Clear cookies
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'userType=; path=/; max-age=0';
      document.cookie = 'userRole=; path=/; max-age=0';
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      localStorage.removeItem('userRole');
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'userType=; path=/; max-age=0';
      document.cookie = 'userRole=; path=/; max-age=0';
      router.push('/');
    }
  };

  if (!user) {
    return null; // Or a loading spinner
  }

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
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-indigo-800/90 to-blue-900/95"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Dashboard Header with Animation */}
          <div className="p-6 border-b border-white/20 backdrop-blur-sm">
            <div className={`flex items-center justify-center gap-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="relative w-12 h-12 flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/30 animate-pulse">
                <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              {sidebarOpen && (
                <div className="animate-slide-in">
                  <h2 className="text-lg font-bold font-[var(--font-poppins)] text-white drop-shadow-lg">Espace Administrateur</h2>
                  <p className="text-xs text-purple-200 mt-0.5">Gérez la plateforme</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {[
              { name: 'Dashboard', icon: 'dashboard', path: '/dashboard-admin' },
              { name: 'Utilisateurs', icon: 'users', path: '/dashboard-admin/users' },
              { name: 'Abonnements', icon: 'subscription', path: '/dashboard-admin/abonnement' },
              { name: 'Véhicules', icon: 'car', path: '/dashboard-admin/cars' },
              { name: 'Encaissements', icon: 'money', path: '/dashboard-admin/payments' },
              { name: 'Paramètres', icon: 'settings', path: '/dashboard-admin/settings' },
            ].map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard-admin' && pathname?.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                      : 'text-purple-100 hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
                  }`}
                >
                  <div className="w-5 h-5 flex-shrink-0">
                    {item.icon === 'dashboard' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    )}
                    {item.icon === 'users' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    )}
                    {item.icon === 'subscription' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'car' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                      </svg>
                    )}
                    {item.icon === 'inspection' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'workshop' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'message' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                    )}
                    {item.icon === 'money' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.icon === 'settings' && (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
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
                <p className="text-2xl font-bold mb-1 text-white drop-shadow-md">36,712 000 DA</p>
                <p className="text-xs text-purple-100">Total encaissements</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <button className="p-2.5 hover:bg-gray-100 rounded-xl relative transition-all group">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                  {user ? (
                    user.firstName ? (
                      `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`
                    ) : 'A'
                  ) : 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user ? (user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin') : 'Admin'}
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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={handleLogout}
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
