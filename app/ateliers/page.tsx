'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getImageUrl } from "@/utils/backend";

interface Workshop {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'mechanic' | 'paint_vehicle' | 'mechanic_paint_inspector';
  certifie?: boolean;
  status?: boolean;
  price_visit_mec?: number;
  price_visit_paint?: number;
}

export default function AteliersPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [workshopImages, setWorkshopImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const res = await fetch('/api/workshop/active');
        const data = await res.json();
        
        if (data.ok && data.workshops) {
          setWorkshops(data.workshops);
          
          // Fetch workshop images
          const imagesMap: Record<string, string> = {};
          await Promise.all(
            data.workshops.map(async (workshop: Workshop) => {
              try {
                const imgRes = await fetch(`/api/user-image/${workshop._id || workshop.id}`);
                if (imgRes.ok) {
                  const imgData = await imgRes.json();
                  if (imgData.ok && imgData.userImage && imgData.userImage.image) {
                    imagesMap[workshop._id || workshop.id || ''] = imgData.userImage.image;
                  }
                }
              } catch (error) {
                console.error(`Error fetching image for workshop ${workshop._id}:`, error);
              }
            })
          );
          setWorkshopImages(imagesMap);
        }
      } catch (error) {
        console.error('Error fetching workshops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'mechanic':
        return 'Mécanique';
      case 'paint_vehicle':
        return 'Peinture véhicule';
      case 'mechanic_paint_inspector':
        return 'Mécanique & Peinture Inspecteur';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-teal-200/50 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Chargement des ateliers...</p>
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
            Ateliers Certifiés
          </h1>
          <p className="text-gray-600 mt-2">
            Découvrez nos ateliers de vérification agréés
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        {workshops.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Aucun atelier disponible pour le moment</h2>
            <p className="text-gray-600">Revenez bientôt pour découvrir nos ateliers certifiés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => {
              const workshopImage = workshopImages[workshop._id || workshop.id || ''];
              return (
                <Link
                  key={workshop._id || workshop.id}
                  href={`/workshops/${workshop._id || workshop.id}`}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-teal-400 hover:scale-105 transform"
                >
                  <div className="flex flex-col">
                    {/* Header with Avatar */}
                    <div className="flex items-center gap-4 mb-4">
                      {workshopImage ? (
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-teal-500 shadow-lg flex-shrink-0">
                          <Image
                            src={getImageUrl(workshopImage) || '/images/default-avatar.png'}
                            alt={workshop.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                          {workshop.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {workshop.name}
                        </h3>
                        {workshop.certifie && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 rounded-full text-xs font-semibold mt-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Certifié
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Role Badge */}
                    <div className="mb-4">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {getRoleLabel(workshop.role)}
                      </span>
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-2">{workshop.address}</span>
                    </div>
                    
                    {/* Prices */}
                    <div className="space-y-2 mb-4">
                      {workshop.price_visit_mec && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Vérification mécanique:</span>
                          <span className="font-semibold text-teal-600">{workshop.price_visit_mec} DA</span>
                        </div>
                      )}
                      {workshop.price_visit_paint && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Vérification peinture:</span>
                          <span className="font-semibold text-teal-600">{workshop.price_visit_paint} DA</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{workshop.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{workshop.phone}</span>
                      </div>
                    </div>
                    
                    {/* View Profile Button */}
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
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
