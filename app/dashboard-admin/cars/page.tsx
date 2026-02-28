'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/utils/backend';

interface RdvWorkshop {
  id: string;
  workshop: {
    id: string;
    name: string;
    email: string;
  } | null;
  images: string[];
  rapport_pdf: string | null;
  date: string;
  time: string;
  createdAt: string;
}

interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number;
  status: 'no_proccess' | 'en_attente' | 'actif' | 'sold';
  images: string[];
  vin?: string;
  vinRemark?: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  createdAt: string;
  rdvWorkshops?: RdvWorkshop[];
}

const statusConfig = {
  'no_proccess': {
    label: 'Non Traité',
    color: 'from-red-500 to-red-600',
    bgColor: 'from-red-50 to-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  'en_attente': {
    label: 'En Attente',
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'from-yellow-50 to-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  'actif': {
    label: 'Actif',
    color: 'from-green-500 to-green-600',
    bgColor: 'from-green-50 to-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'sold': {
    label: 'Vendu',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'from-purple-50 to-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
};

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);
  const [carToWarn, setCarToWarn] = useState<Car | null>(null);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/cars', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setCars(data.cars || []);
        }
      }
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter cars by status
  const carsByStatus = {
    'no_proccess': cars.filter(car => car.status === 'no_proccess'),
    'en_attente': cars.filter(car => car.status === 'en_attente'),
    'actif': cars.filter(car => car.status === 'actif'),
    'sold': cars.filter(car => car.status === 'sold'),
  };

  // Filter by search term
  const filterCars = (carsList: Car[]) => {
    if (!searchTerm) return carsList;
    const term = searchTerm.toLowerCase();
    return carsList.filter(car =>
      car.brand.toLowerCase().includes(term) ||
      car.model.toLowerCase().includes(term) ||
      (car.owner && `${car.owner.firstName} ${car.owner.lastName}`.toLowerCase().includes(term))
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des véhicules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
          Gestion des Véhicules
        </h1>
        <p className="text-gray-600">Tous les véhicules de la plateforme</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Rechercher par marque, modèle ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              Total: <span className="font-bold text-gray-900">{cars.length}</span> véhicules
            </div>
          </div>
        </div>
      </div>

      {/* Status Sections */}
      {(['no_proccess', 'en_attente', 'actif', 'sold'] as const).map((status) => {
        const config = statusConfig[status];
        const filteredCars = filterCars(carsByStatus[status]);

        return (
          <div key={status} className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Section Header */}
              <div className={`bg-gradient-to-r ${config.color} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                      {config.label}
                    </h2>
                    <p className="text-sm text-white/80">
                      {filteredCars.length} véhicule{filteredCars.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cars Grid */}
              <div className="p-6">
                {filteredCars.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">Aucun véhicule {config.label.toLowerCase()}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCars.map((car) => (
                      <Link
                        key={car.id}
                        href={`/cars/${car.id}`}
                        className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-lg overflow-hidden group"
                      >
                        {/* Car Image */}
                        <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                          {car.images && car.images.length > 0 ? (
                            <Image
                              src={getImageUrl(car.images[0])}
                              alt={`${car.brand} ${car.model}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                              <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                              </svg>
                            </div>
                          )}
                          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${config.color} shadow-lg`}>
                            {config.label}
                          </div>
                        </div>

                        {/* Car Details */}
                        <div className="p-5">
                          <h3 className="text-xl font-bold text-gray-900 mb-1 font-[var(--font-poppins)]">
                            {car.brand} {car.model}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">Année {car.year} • {car.km.toLocaleString('fr-FR')} km</p>

                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Prix</p>
                              <p className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">
                                {formatPrice(car.price)} DA
                              </p>
                            </div>
                          </div>

                          {/* Owner Info */}
                          {car.owner && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {car.owner.firstName.charAt(0)}{car.owner.lastName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {car.owner.firstName} {car.owner.lastName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{car.owner.email}</p>
                              </div>
                            </div>
                          )}

                          {/* Date */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Ajouté le {formatDate(car.createdAt)}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 space-y-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedCar(car);
                                setShowDetailsModal(true);
                              }}
                              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
                            >
                              Voir les Détails
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCarToWarn(car);
                                  setWarningMessage(`Veuillez corriger le prix de votre véhicule "${car.brand} ${car.model}" dans les 24 heures, sinon il sera supprimé.`);
                                  setShowWarningModal(true);
                                }}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Avertir
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCarToDelete(car);
                                  setShowDeleteModal(true);
                                }}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold text-sm hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Details Modal */}
      {showDetailsModal && selectedCar && (
        <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${statusConfig[selectedCar.status].color} px-6 py-4 flex items-center justify-between sticky top-0 z-10`}>
              <div>
                <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                  Détails du Véhicule
                </h2>
                <p className="text-sm text-white/80">
                  {selectedCar.brand} {selectedCar.model}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCar(null);
                }}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Images Gallery */}
              {selectedCar.images && selectedCar.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedCar.images.map((image, index) => (
                      <div key={index} className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                        <Image
                          src={getImageUrl(image) || ''}
                          alt={`${selectedCar.brand} ${selectedCar.model} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Car Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Basic Information */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)] flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    Informations Générales
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Marque</span>
                      <span className="text-sm font-bold text-gray-900">{selectedCar.brand}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Modèle</span>
                      <span className="text-sm font-bold text-gray-900">{selectedCar.model}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Année</span>
                      <span className="text-sm font-bold text-gray-900">{selectedCar.year}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Kilométrage</span>
                      <span className="text-sm font-bold text-gray-900">{selectedCar.km.toLocaleString('fr-FR')} km</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 font-medium">Prix</span>
                      <span className="text-lg font-bold text-blue-600">{formatPrice(selectedCar.price)} DA</span>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)] flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Statut et Dates
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Statut</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${statusConfig[selectedCar.status].color}`}>
                        {statusConfig[selectedCar.status].label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Date d'ajout</span>
                      <span className="text-sm font-bold text-gray-900">{formatDate(selectedCar.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 font-medium">ID Véhicule</span>
                      <span className="text-xs font-mono text-gray-500">{selectedCar.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIN Information - On separate line */}
              {selectedCar.vin && (
                <div className="mt-4 w-full">
                  <p className="text-sm font-semibold text-teal-800 mb-2">Numéro VIN</p>
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <p className="text-base font-mono text-teal-900">{selectedCar.vin}</p>
                    {selectedCar.vinRemark && (
                      <p className="text-sm text-teal-700 italic mt-1">{selectedCar.vinRemark}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Owner Information */}
              {selectedCar.owner && (
                <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)] flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Informations du Propriétaire
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {selectedCar.owner.firstName.charAt(0)}{selectedCar.owner.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedCar.owner.firstName} {selectedCar.owner.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{selectedCar.owner.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span className="text-sm text-gray-600">{selectedCar.owner.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className="text-sm text-gray-600">{selectedCar.owner.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RDV Workshops Section */}
              {selectedCar.rdvWorkshops && selectedCar.rdvWorkshops.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-[var(--font-poppins)] flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Rapports d'Inspection ({selectedCar.rdvWorkshops.length})
                  </h3>
                  <div className="space-y-6">
                    {selectedCar.rdvWorkshops.map((rdv) => (
                      <div key={rdv.id} className="bg-white rounded-xl p-5 border-2 border-gray-200">
                        {/* Workshop Info */}
                        {rdv.workshop && (
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {rdv.workshop.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{rdv.workshop.name}</p>
                              <p className="text-xs text-gray-600">{rdv.workshop.email}</p>
                            </div>
                            <div className="ml-auto text-right">
                              <p className="text-sm text-gray-600">{formatDate(rdv.date)}</p>
                              <p className="text-xs text-gray-500">{rdv.time}</p>
                            </div>
                          </div>
                        )}

                        {/* Images */}
                        {rdv.images && rdv.images.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              Images ({rdv.images.length})
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {rdv.images.map((image, index) => (
                                <div key={index} className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                                  <Image
                                    src={getImageUrl(image) || ''}
                                    alt={`Image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PDF Report */}
                        {rdv.rapport_pdf && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              Rapport PDF
                            </h4>
                            <a
                              href={getImageUrl(rdv.rapport_pdf) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Télécharger le PDF
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCar(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && carToDelete && (
        <>
          <div
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => {
              setShowDeleteModal(false);
              setCarToDelete(null);
            }}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white font-[var(--font-poppins)]">
                        Confirmer la suppression
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setCarToDelete(null);
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Êtes-vous sûr de vouloir supprimer <strong>"{carToDelete.brand} {carToDelete.model}"</strong> ?
                </p>
                <p className="text-sm text-red-600 mb-6 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Cette action est irréversible. La voiture et toutes ses données associées seront définitivement supprimées.</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`/api/admin/cars/${carToDelete.id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                        });
                        if (res.ok) {
                          alert('Voiture supprimée avec succès');
                          fetchCars();
                          setShowDeleteModal(false);
                          setCarToDelete(null);
                          if (selectedCar && selectedCar.id === carToDelete.id) {
                            setShowDetailsModal(false);
                            setSelectedCar(null);
                          }
                        } else {
                          const data = await res.json();
                          alert(data.message || 'Erreur lors de la suppression');
                        }
                      } catch (error) {
                        console.error('Error deleting car:', error);
                        alert('Erreur lors de la suppression');
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Confirmer la suppression
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setCarToDelete(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Warning Modal */}
      {showWarningModal && carToWarn && (
        <>
          <div
            className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm z-50"
            onClick={() => {
              setShowWarningModal(false);
              setCarToWarn(null);
              setWarningMessage('');
            }}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white font-[var(--font-poppins)]">
                        Envoyer un avertissement
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowWarningModal(false);
                      setCarToWarn(null);
                      setWarningMessage('');
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Véhicule concerné
                  </label>
                  <p className="text-gray-900 font-medium">
                    {carToWarn.brand} {carToWarn.model} ({carToWarn.year})
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message d'avertissement
                  </label>
                  <textarea
                    value={warningMessage}
                    onChange={(e) => setWarningMessage(e.target.value)}
                    placeholder="Écrivez votre message d'avertissement..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le propriétaire recevra ce message et aura 24 heures pour corriger le prix.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!warningMessage.trim()) {
                        alert('Veuillez saisir un message d\'avertissement');
                        return;
                      }
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`/api/admin/cars/${carToWarn.id}/warning`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ message: warningMessage.trim() }),
                        });
                        if (res.ok) {
                          alert('Avertissement envoyé avec succès');
                          fetchCars();
                          setShowWarningModal(false);
                          setCarToWarn(null);
                          setWarningMessage('');
                          if (selectedCar && selectedCar.id === carToWarn.id) {
                            setShowDetailsModal(false);
                            setSelectedCar(null);
                          }
                        } else {
                          const data = await res.json();
                          alert(data.message || 'Erreur lors de l\'envoi de l\'avertissement');
                        }
                      } catch (error) {
                        console.error('Error sending warning:', error);
                        alert('Erreur lors de l\'envoi de l\'avertissement');
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Envoyer l'avertissement
                  </button>
                  <button
                    onClick={() => {
                      setShowWarningModal(false);
                      setCarToWarn(null);
                      setWarningMessage('');
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
