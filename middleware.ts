import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
  const publicCarRoutes = pathname.startsWith('/cars/');

  // If it's a public route, allow access
  if (publicRoutes.includes(pathname) || publicCarRoutes) {
    return NextResponse.next();
  }

  // Protected dashboard routes
  const adminRoutes = pathname.startsWith('/dashboard-admin');
  const sellerRoutes = pathname.startsWith('/dashboard-seller');
  const workshopRoutes = pathname.startsWith('/dashboard-workshop');

  // Get token and user data from cookies (we'll also check localStorage on client side)
  const token = request.cookies.get('token')?.value;
  const userType = request.cookies.get('userType')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // If accessing a dashboard without token, redirect to home (not login, as per requirement)
  if ((adminRoutes || sellerRoutes || workshopRoutes) && !token) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Check admin routes
  if (adminRoutes) {
    if (userType !== 'user' || userRole !== 'admin') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Check seller routes
  if (sellerRoutes) {
    if (userType !== 'user' || userRole === 'admin') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Check workshop routes
  if (workshopRoutes) {
    if (userType !== 'workshop') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
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
