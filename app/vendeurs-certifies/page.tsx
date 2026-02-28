'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getImageUrl } from "@/utils/backend";

interface User {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  certifie?: boolean;
  status?: boolean;
  role?: string;
}

export default function VendeursCertifiesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userImages, setUserImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCertifiedSellers = async () => {
      try {
        const res = await fetch('/api/user/certified-sellers');
        const data = await res.json();
        
        if (data.ok && data.users) {
          setUsers(data.users);
          
          // Fetch user images
          const imagesMap: Record<string, string> = {};
          await Promise.all(
            data.users.map(async (user: User) => {
              try {
                const imgRes = await fetch(`/api/user-image/${user._id || user.id}`);
                if (imgRes.ok) {
                  const imgData = await imgRes.json();
                  if (imgData.ok && imgData.userImage && imgData.userImage.image) {
                    imagesMap[user._id || user.id || ''] = imgData.userImage.image;
                  }
                }
              } catch (error) {
                console.error(`Error fetching image for user ${user._id}:`, error);
              }
            })
          );
          setUserImages(imagesMap);
        }
      } catch (error) {
        console.error('Error fetching certified sellers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertifiedSellers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-teal-200/50 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Chargement des vendeurs certifiés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/98 backdrop-blur-lg border-b border-gray-200/60 shadow-md">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
            Vendeurs Certifiés
          </h1>
          <p className="text-gray-600 mt-2">
            Découvrez nos vendeurs vérifiés et certifiés
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        {users.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Aucun vendeur certifié pour le moment</h2>
            <p className="text-gray-600">Revenez bientôt pour découvrir nos vendeurs vérifiés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {users.map((user) => {
              const userImage = userImages[user._id || user.id || ''];
              return (
                <Link
                  key={user._id || user.id}
                  href={`/users/${user._id || user.id}`}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-teal-400 hover:scale-105 transform"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar */}
                    {userImage ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-teal-500 shadow-lg mb-4">
                        <Image
                          src={getImageUrl(userImage) || '/images/default-avatar.png'}
                          alt={`${user.firstName} ${user.lastName}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-teal-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                    )}
                    
                    {/* Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {user.firstName} {user.lastName}
                    </h3>
                    
                    {/* Certified Badge */}
                    {user.certifie && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 rounded-full text-xs font-semibold mb-3">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Certifié
                      </div>
                    )}
                    
                    {/* Contact Info */}
                    <div className="mt-4 space-y-2 w-full">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{user.phone}</span>
                      </div>
                    </div>
                    
                    {/* View Profile Button */}
                    <button className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
                      Voir le profil
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
