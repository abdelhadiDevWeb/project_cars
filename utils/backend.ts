/**
 * Get the backend URL from environment variables
 * Falls back to default if not set
 * 
 * Note: For client-side access, use NEXT_PUBLIC_BACKEND_URL in .env.local
 */
export function getBackendUrl(): string {
  // In Next.js, environment variables prefixed with NEXT_PUBLIC_ are available on the client
  if (typeof window !== 'undefined') {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7000";
    return backendUrl.replace(/\/$/, "");
  }
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:7000";
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
  
  // Use relative path for uploads (Next.js will proxy it)
  if (cleanPath.startsWith('/uploads/')) {
    return cleanPath;
  }
  
  // For other paths, return as is (they're served by Next.js)
  return cleanPath;
}
