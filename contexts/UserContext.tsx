'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  firstName?: string; // For regular users
  lastName?: string; // For regular users
  name?: string; // For workshops
  email: string;
  phone: string;
  status: boolean;
  role?: string;
  type?: string; // 'user' or 'workshop'
  workshopType?: string; // For workshops: 'mechanic', 'paint_vehicle', or 'mechanic_paint_inspector'
  adr?: string; // For workshops
  verfie?: boolean; // For workshops
  certifie?: boolean; // For workshops and users - certification status
  price_visite?: number | null; // For workshops - price for car visit
  price_visit_mec?: number | null; // For workshops - price for mechanic visit
  price_visit_paint?: number | null; // For workshops - price for paint visit
}

interface UserContextType {
  user: User | null;
  token: string | null;
  userType: string | null;
  userRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User, type: string, role?: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize from localStorage on mount - only once
  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;

    const initAuth = async () => {
      // Prevent multiple initializations
      if (hasInitialized) return;
      hasInitialized = true;

      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedUserType = localStorage.getItem('userType');
        const storedUserRole = localStorage.getItem('userRole');

        if (storedToken && storedUser) {
          // Verify token is still valid by fetching user data - only once
          try {
            const res = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (!isMounted) return;

            if (res.ok) {
              const data = await res.json();
              if (data.ok && data.user) {
                setToken(storedToken);
                setUser(data.user);
                setUserType(data.user.type || storedUserType);
                setUserRole(data.user.role || storedUserRole);
              } else {
                // Invalid response, use stored data
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                setUserType(storedUserType);
                setUserRole(storedUserRole);
              }
            } else {
              // Token invalid, clear storage
              if (isMounted) {
                clearAuth();
              }
            }
          } catch (error) {
            console.error('Error verifying token:', error);
            // If verification fails, use stored data
            if (isMounted) {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              setUserType(storedUserType);
              setUserRole(storedUserRole);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole');
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'userType=; path=/; max-age=0';
    document.cookie = 'userRole=; path=/; max-age=0';
    setUser(null);
    setToken(null);
    setUserType(null);
    setUserRole(null);
  };

  const login = (newToken: string, newUser: User, type: string, role?: string) => {
    setToken(newToken);
    setUser(newUser);
    setUserType(type);
    setUserRole(role || 'client');

    // Store in localStorage
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('userType', type);
    localStorage.setItem('userRole', role || 'client');

    // Store in cookies for middleware
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    document.cookie = `token=${newToken}; path=/; max-age=${maxAge}`;
    document.cookie = `userType=${type}; path=/; max-age=${maxAge}`;
    document.cookie = `userRole=${role || 'client'}; path=/; max-age=${maxAge}`;
  };

  const logout = async () => {
    try {
      // Call logout API
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Ignore errors, logout will proceed anyway
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: UserContextType = {
    user,
    token,
    userType,
    userRole,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
