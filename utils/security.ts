/**
 * Security utilities for frontend
 */

/**
 * Store token securely (consider using httpOnly cookies in production)
 */
export const storeToken = (token: string, userType: string, userRole?: string): void => {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('userType', userType);
    if (userRole) {
      localStorage.setItem('userRole', userRole);
    }

    // Also set cookies for middleware access
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
    document.cookie = `userType=${userType}; path=/; max-age=${maxAge}; SameSite=Strict`;
    if (userRole) {
      document.cookie = `userRole=${userRole}; path=/; max-age=${maxAge}; SameSite=Strict`;
    }
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole');

    // Clear cookies
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'userType=; path=/; max-age=0';
    document.cookie = 'userRole=; path=/; max-age=0';
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  try {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    return !!token && (userType === 'user' || userType === 'workshop');
  } catch (error) {
    return false;
  }
};

/**
 * Get user role safely
 */
export const getUserRole = (): string | null => {
  try {
    return localStorage.getItem('userRole');
  } catch (error) {
    return null;
  }
};

/**
 * Get user type safely
 */
export const getUserType = (): string | null => {
  try {
    return localStorage.getItem('userType');
  } catch (error) {
    return null;
  }
};

/**
 * Escape HTML to prevent XSS
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};
