import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // IMPORTANT:
  // Middleware bugs can make routes *look* like they don't exist (404).
  // Always fail open (NextResponse.next()) so routing remains functional.
  try {
    const { pathname } = request.nextUrl;

    // Get token and user data from cookies
    const token = request.cookies.get('token')?.value;
    const userType = request.cookies.get('userType')?.value; // 'user' | 'workshop'
    const userRole = request.cookies.get('userRole')?.value; // 'admin' | 'client'

    // Public routes that don't require authentication
    const publicRoutes = new Set([
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/faq',
      '/ateliers',
      '/vendeurs-certifies',
    ]);

    // Public dynamic routes
    const publicDynamicRoutes =
      pathname.startsWith('/cars/') ||
      pathname.startsWith('/workshops/') ||
      pathname.startsWith('/users/') ||
      pathname.startsWith('/verify-car/');

    if (publicRoutes.has(pathname) || publicDynamicRoutes) {
      return NextResponse.next();
    }

    // Block admin access to home and chats pages (keep UX consistent)
    if (token && userType === 'user' && userRole === 'admin') {
      if (pathname === '/' || pathname === '/chats') {
        return NextResponse.redirect(new URL('/dashboard-admin', request.url));
      }
    }

    // Protected dashboard routes
    const adminRoutes = pathname.startsWith('/dashboard-admin');
    const sellerRoutes = pathname.startsWith('/dashboard-seller');
    const workshopRoutes = pathname.startsWith('/dashboard-workshop');

    // If accessing a dashboard without token, redirect to home (not login)
    if ((adminRoutes || sellerRoutes || workshopRoutes) && !token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check admin routes
    if (adminRoutes) {
      if (userType !== 'user' || userRole !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // Check seller routes (any authenticated 'user' who is not admin)
    if (sellerRoutes) {
      if (userType !== 'user' || userRole === 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // Check workshop routes
    if (workshopRoutes) {
      if (userType !== 'workshop') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
