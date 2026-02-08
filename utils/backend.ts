/**
 * Get the backend URL from environment variables
 * Falls back to default if not set
 * 
 * Note: For client-side access, use NEXT_PUBLIC_ prefix in .env.local
 * Example: NEXT_PUBLIC_URLBACKEND=http://localhost:8001
 */
export function getBackendUrl(): string {
  // In Next.js, environment variables prefixed with NEXT_PUBLIC_ are available on the client
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefixed env vars
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                       process.env.NEXT_PUBLIC_URLBACKEND || 
                       'http://localhost:8001';
    // Remove trailing slash if present
    return backendUrl.replace(/\/$/, '');
  }
  // Server-side
  const backendUrl = process.env.BACKEND_URL || 
                     process.env.URLBACKEND || 
                     'http://localhost:8001';
  // Remove trailing slash if present
  return backendUrl.replace(/\/$/, '');
}

/**
 * Get the full image URL from a relative path
 * Only returns URLs for database images, no fallbacks
 */
export function getImageUrl(imagePath: string): string | null {
  if (!imagePath || imagePath.trim() === '') {
    return null; // No fallback, return null if no image
  }
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /, it's already a path
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Use backend URL for uploads
  if (cleanPath.startsWith('/uploads/')) {
    const backendUrl = getBackendUrl().replace(/\/$/, ''); // Remove trailing slash
    return `${backendUrl}${cleanPath}`;
  }
  
  // For other paths, return as is (they're served by Next.js)
  return cleanPath;
}
