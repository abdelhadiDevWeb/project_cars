'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { getImageUrl } from "@/utils/backend";

interface Car {
  _id: string;
  id?: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number;
  images: string[];
  status: string;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const heroCars = [
  "/images/car1.png",
  "/images/car2.png",
  "/images/car3.png",
];


// Scroll reveal hook
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

export default function Home() {
  const { isLoading, isAuthenticated, user, userType, userRole } = useUser();
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [stats, setStats] = useState({
    activeCars: 0,
    verifiedUsers: 0,
    verifiedWorkshops: 0,
  });
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    brand: '',
    model: '',
    maxPrice: '',
    maxKm: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const heroRef = useScrollReveal();
  const statsRef = useRef<HTMLDivElement>(null);

  // Hero carousel auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroCars.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active cars
  const fetchActiveCars = async (filters?: typeof searchFilters) => {
    try {
      setLoadingCars(true);
      setIsSearching(!!filters);
      
      // Build query string
      const params = new URLSearchParams();
      if (filters) {
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.model) params.append('model', filters.model);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.maxKm) params.append('maxKm', filters.maxKm);
      }
      
      const queryString = params.toString();
      const url = `/api/car/active${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.cars) {
          setCars(data.cars);
        }
      }
    } catch (error) {
      console.error('Error fetching active cars:', error);
    } finally {
      setLoadingCars(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchActiveCars();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActiveCars(searchFilters);
  };

  const handleFilterChange = (field: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.stats) {
            setStats({
              activeCars: data.stats.activeCars || 0,
              verifiedUsers: data.stats.verifiedUsers || 0,
              verifiedWorkshops: data.stats.verifiedWorkshops || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <nav className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl p-2 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="CarSure DZ Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                CarSure DZ
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center gap-6">
              {['Achéteurs Certifiés', 'Vendeurs Certifiés', 'Ateliers', 'FAQ', 'Blog'].map((link, i) => (
                <a 
                  key={i}
                  href="#" 
                  className="text-gray-700 hover:text-teal-600 transition-all duration-200 font-medium text-sm relative group"
                >
                  {link}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal-600 transition-all duration-200 group-hover:w-full"></span>
                </a>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              {isLoading ? (
                <div className="px-6 py-2.5 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : isAuthenticated && (userType === 'workshop' || userType === 'user') ? (
                userType === 'workshop' ? (
                  <Link href="/dashboard-workshop" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg hover:shadow-xl">
                    Tableau de bord
                  </Link>
                ) : userType === 'user' && userRole === 'admin' ? (
                  <Link href="/dashboard-admin" className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg hover:shadow-xl">
                    Tableau de bord
                  </Link>
                ) : userType === 'user' && userRole !== 'admin' ? (
                  <Link href="/dashboard-seller" className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg hover:shadow-xl">
                    Tableau de bord
                  </Link>
                ) : null
              ) : (
                <Link href="/login" className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg hover:shadow-xl">
                  Se Connecter
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section - Modern Design */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 -mt-1">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 lg:px-8 w-full py-6 lg:py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Left Side - Text Content */}
            <div 
              ref={heroRef.ref}
              className={`space-y-8 lg:space-y-10 ${heroRef.isVisible ? 'animate-slide-up-fade' : 'opacity-0'}`}
            >
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 rounded-full text-xs font-semibold shadow-md border border-teal-200/50">
                  <span className="text-base">✨</span>
                  <span>Plateforme de confiance</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] font-[var(--font-poppins)]">
                  <span className="block bg-gradient-to-r from-blue-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent mb-1.5">
                    Achetez et vendez
                  </span>
                  <span className="block bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent mb-1.5">
                    des véhicules certifiés
                  </span>
                  <span className="block text-gray-800">
                    en toute confiance
                  </span>
              </h1>
              
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                  La plateforme de référence en Algérie pour acheter et vendre des véhicules d&apos;occasion vérifiés et certifiés par des ateliers agréés.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-white/50 hover:shadow-lg transition-all">
                  <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">Vérifiés par des experts</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-white/50 hover:shadow-lg transition-all">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">100% Sécurisé</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a 
                  href="#search" 
                  className="group px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-xl hover:shadow-2xl hover:scale-105 transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Trouver une voiture
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <Link 
                  href="/register" 
                  className="px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold transition-all duration-300 text-sm text-center shadow-lg hover:shadow-xl border-2 border-gray-200 hover:border-teal-400 hover:scale-105 transform"
                >
                  Déposer mon véhicule
                </Link>
              </div>
            </div>

            {/* Right Side - Car Image */}
            <div className="relative h-[300px] sm:h-[380px] lg:h-[450px] xl:h-[520px] w-full lg:w-auto order-first lg:order-last lg:mt-2 xl:mt-4">
              <div className="relative w-full h-full">
                {/* Main Image Container with Modern Frame */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-gray-50 p-4 lg:p-6 border-4 border-white/80">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {heroCars.map((car, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                          index === currentHeroIndex 
                            ? 'opacity-100 scale-100 z-10' 
                            : 'opacity-0 scale-110 z-0'
                        }`}
                      >
                        <Image
                          src={car}
                          alt={`Car ${index + 1}`}
                          fill
                          className="object-contain object-center p-4"
                          priority={index === 0}
                        />
                        {/* Subtle overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Carousel Indicators - Modern Design */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-xl border border-white/50">
                {heroCars.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentHeroIndex(index)}
                        className={`rounded-full transition-all duration-300 ${
                      index === currentHeroIndex
                            ? 'w-10 h-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md'
                            : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                        aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
                  </div>
                  
                  {/* Navigation Arrows */}
                  <button
                    onClick={() => setCurrentHeroIndex((prev) => (prev - 1 + heroCars.length) % heroCars.length)}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-white/50"
                    aria-label="Previous car"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentHeroIndex((prev) => (prev + 1) % heroCars.length)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-white/50"
                    aria-label="Next car"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {/* Decorative Elements - Enhanced */}
                <div className="absolute -top-6 -right-6 w-40 h-40 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
                <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-gradient-to-br from-blue-400/30 to-teal-400/30 rounded-full blur-3xl -z-10 animate-pulse animation-delay-2000"></div>
                
                {/* Floating Badge */}
                <div className="absolute -top-4 left-4 z-20 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Certifié
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search/Filter Section */}
      <section id="search" className="container mx-auto px-4 lg:px-8 py-8 -mt-20 relative z-20 mt-8">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 lg:p-8 border border-gray-200/50">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-teal-700 bg-clip-text text-transparent mb-2 font-[var(--font-poppins)]">
            Dernières Offres Certifiées
          </h2>
            <p className="text-gray-600">Recherchez parmi nos véhicules vérifiés</p>
          </div>
          
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <input
              type="text"
              value={searchFilters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              placeholder="Marque"
              list="brands-list"
              className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-gray-700 text-sm shadow-sm hover:shadow-md"
            />
            <datalist id="brands-list">
              <option value="Volkswagen">Volkswagen</option>
              <option value="Hyundai">Hyundai</option>
              <option value="BMW">BMW</option>
              <option value="Mercedes">Mercedes</option>
              <option value="Peugeot">Peugeot</option>
              <option value="Renault">Renault</option>
              <option value="Toyota">Toyota</option>
              <option value="Ford">Ford</option>
              <option value="Audi">Audi</option>
              <option value="Nissan">Nissan</option>
              <option value="Citroën">Citroën</option>
              <option value="Opel">Opel</option>
              <option value="Fiat">Fiat</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Dacia">Dacia</option>
            </datalist>
            
            <input
              type="text"
              value={searchFilters.model}
              onChange={(e) => handleFilterChange('model', e.target.value)}
              placeholder="Modèle"
              className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-gray-700 text-sm shadow-sm hover:shadow-md"
            />
            
            <input
              type="number"
              value={searchFilters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              placeholder="Prix Maximum"
              min="0"
              className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-gray-700 text-sm shadow-sm hover:shadow-md"
            />
            
            <input
              type="number"
              value={searchFilters.maxKm}
              onChange={(e) => handleFilterChange('maxKm', e.target.value)}
              placeholder="Km Maximum"
              min="0"
              className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-gray-700 text-sm shadow-sm hover:shadow-md"
            />
            
            <button 
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              {isSearching ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              )}
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* Main Content - Cars and Statistics */}
      <section className="container mx-auto px-4 lg:px-8 py-12 pt-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Car Listings */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-teal-700 bg-clip-text text-transparent mb-2 font-[var(--font-poppins)]">
              Dernières Offres Certifiées
            </h2>
              <p className="text-gray-600">Découvrez notre sélection de véhicules vérifiés</p>
            </div>
            
            {loadingCars ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <svg className="animate-spin h-16 w-16 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-gray-600 font-medium">Chargement des véhicules...</p>
                </div>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-gray-700 mb-2">Aucune voiture disponible</p>
                <p className="text-gray-600">Aucune voiture active disponible pour le moment.</p>
              </div>
            ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {cars.map((car, index) => (
                  <div
                    key={car._id || car.id}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-teal-300 hover:-translate-y-2"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                    <Link href={`/cars/${car._id || car.id}`}>
                      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        {car.images && car.images.length > 0 && getImageUrl(car.images[0]) ? (
                    <Image
                            src={getImageUrl(car.images[0])!}
                            alt={`${car.brand} ${car.model}`}
                      fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
                          ✓ Certifié
                        </div>
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md">
                          {car.year}
                        </div>
                      </div>
                    </Link>
                    
                    <div className="p-6 space-y-4">
                      <Link href={`/cars/${car._id || car.id}`}>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-teal-700 bg-clip-text text-transparent font-[var(--font-poppins)] group-hover:from-teal-600 group-hover:to-cyan-600 transition-all">
                          {car.brand} {car.model}
                        </h3>
                      </Link>
                      
                      {car.owner && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {car.owner.firstName[0]}{car.owner.lastName[0]}
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Vendeur</span>
                            <Link 
                              href={`/users/${car.owner._id}`}
                              className="block text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {car.owner.firstName} {car.owner.lastName}
                            </Link>
                          </div>
                      </div>
                    )}
                  
                      <div className="flex items-center gap-4 text-gray-600 text-sm bg-gray-50 rounded-xl p-3">
                        <span className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          </div>
                          <span className="font-semibold">{car.km.toLocaleString()} km</span>
                      </span>
                        <span className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          </div>
                          <span className="font-semibold">{car.year}</span>
                      </span>
                    </div>
                    
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <div>
                          <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                            {car.price.toLocaleString()} DA
                      </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          ACTIF
                        </div>
                    </div>
                    
                      <Link href={`/cars/${car._id || car.id}`}>
                        <div className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 text-sm text-center cursor-pointer shadow-lg hover:shadow-xl group-hover:scale-105">
                      Voir Détails
                        </div>
                      </Link>
                    </div>
                  </div>
              ))}
            </div>
            )}
          </div>

          {/* Statistics Sidebar */}
          <div ref={statsRef} id="stats-section" className="lg:col-span-1">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-gray-200/50 sticky top-24">
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2 font-[var(--font-poppins)]">
                  CarSure DZ
              </h2>
                <p className="text-gray-600 text-sm">Votre plateforme de confiance</p>
              </div>
              
              <div className="space-y-4">
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                      {stats.activeCars.toLocaleString()}
                    </p>
                    <p className="text-gray-700 text-sm font-medium">Véhicules certifiés</p>
                  </div>
                </div>
                
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                      {stats.verifiedUsers.toLocaleString()}
                    </p>
                    <p className="text-gray-700 text-sm font-medium">Utilisateurs vérifiés</p>
                  </div>
                </div>
                
                <div className="group flex items-center gap-4 p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                      {stats.verifiedWorkshops.toLocaleString()}
                    </p>
                    <p className="text-gray-700 text-sm font-medium">Ateliers partenaires</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a href="#" className="group text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-2 text-sm transition-all">
                  <span>Comment ça fonctionne?</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative w-12 h-12">
                  <Image
                    src="/logo.png"
                    alt="CarSure DZ Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold font-[var(--font-poppins)]">CarSure DZ</span>
              </div>
              <p className="text-gray-400 text-sm">Votre plateforme de confiance pour acheter et vendre des véhicules certifiés en Algérie.</p>
            </div>
            {[
              { title: 'Navigation', links: ['Achéteurs Certifiés', 'Vendeurs Certifiés', 'Ateliers', 'FAQ'] },
              { title: 'Support', links: ['Contact', 'Aide', 'Blog'] },
            ].map((section, i) => (
              <div key={i}>
                <h3 className="font-bold mb-4 font-[var(--font-poppins)]">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="font-bold mb-4 font-[var(--font-poppins)]">Suivez-nous</h3>
              <div className="flex gap-3">
                {['facebook', 'twitter', 'instagram'].map((social, i) => (
                  <a 
                    key={i}
                    href="#" 
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-teal-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      {social === 'facebook' && <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>}
                      {social === 'twitter' && <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>}
                      {social === 'instagram' && <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.949.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 CarSure DZ. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
