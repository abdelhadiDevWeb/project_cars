'use client';

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getImageUrl } from "@/utils/backend";

interface Car {
  _id: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number;
  status: 'no_proccess' | 'en_attente' | 'actif' | 'sold';
  images: string[];
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CarDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params?.id as string;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [carAppointments, setCarAppointments] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{sender: string, message: string, timestamp: Date}>>([]);

  // Fetch car data
  useEffect(() => {
    const fetchCar = async () => {
      try {
        const res = await fetch(`/api/car/${carId}`);
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setError("Erreur serveur: réponse invalide");
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data?.message || "Voiture non trouvée");
          setLoading(false);
          return;
        }

        setCar(data.car);
        
        // Fetch appointments for this car
        const appointmentsRes = await fetch(`/api/rdv-workshop/car/${carId}`);
        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          if (appointmentsData.ok && appointmentsData.appointments) {
            setCarAppointments(appointmentsData.appointments);
          }
        }
        
        // Check if current user is the owner
        const token = localStorage.getItem('token');
        if (token && data.car.owner) {
          try {
            // Decode token to get user ID (simple base64 decode)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id || payload.userId;
            
            const ownerId = typeof data.car.owner === 'string' 
              ? data.car.owner 
              : data.car.owner._id;
            
            const userIsOwner = userId === ownerId;
            setIsOwner(userIsOwner);
            
            if (userIsOwner) {
              setEditFormData({
                brand: data.car.brand,
                model: data.car.model,
                year: data.car.year.toString(),
                km: data.car.km.toString(),
                price: data.car.price.toString(),
              });
            }
          } catch (err) {
            console.error('Error checking ownership:', err);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching car:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
        setLoading(false);
      }
    };

    if (carId) {
      fetchCar();
    }
  }, [carId]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async () => {
    if (!car) return;
    
    setIsUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Vous devez être connecté pour modifier cette voiture");
        setIsUpdating(false);
        return;
      }

      const res = await fetch(`/api/car/update/${car._id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: editFormData.brand,
          model: editFormData.model,
          year: parseInt(editFormData.year),
          km: parseInt(editFormData.km),
          price: parseFloat(editFormData.price),
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        setError("Erreur serveur: réponse invalide");
        setIsUpdating(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Erreur lors de la mise à jour");
        setIsUpdating(false);
        return;
      }

      // Update local state
      setCar({ ...car, ...data.car });
      setEditing(false);
      setIsUpdating(false);
    } catch (error) {
      console.error('Error updating car:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!car) return;
    
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette voiture ? Cette action est irréversible.")) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Vous devez être connecté pour supprimer cette voiture");
        setIsDeleting(false);
        return;
      }

      const res = await fetch(`/api/car/delete/${car._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        setError("Erreur serveur: réponse invalide");
        setIsDeleting(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Erreur lors de la suppression");
        setIsDeleting(false);
        return;
      }

      // Redirect to my-cars page
      router.push('/dashboard-seller/my-cars');
    } catch (error) {
      console.error('Error deleting car:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Véhicule non trouvé"}
          </h1>
          <Link href="/" className="text-teal-600 hover:text-teal-700">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const owner = typeof car.owner === 'object' ? car.owner : null;
  const carName = `${car.brand} ${car.model} ${car.year}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <nav className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl p-2 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
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
            <Link
              href="/"
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Link>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Owner Actions */}
            {isOwner && !editing && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-teal-800 font-semibold">Vous êtes le propriétaire de cette voiture</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors text-sm disabled:opacity-50"
                    >
                      {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isOwner && editing && (
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Modifier la voiture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marque *</label>
                    <input
                      type="text"
                      name="brand"
                      required
                      value={editFormData.brand}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modèle *</label>
                    <input
                      type="text"
                      name="model"
                      required
                      value={editFormData.model}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Année *</label>
                    <input
                      type="number"
                      name="year"
                      required
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      value={editFormData.year}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kilométrage (km) *</label>
                    <input
                      type="number"
                      name="km"
                      required
                      min="0"
                      value={editFormData.km}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix (DA) *</label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      value={editFormData.price}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setError('');
                    }}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Main Image */}
            <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden border border-gray-200">
              {car.images && car.images.length > 0 ? (
              <Image
                  src={getImageUrl(car.images[selectedImage])}
                  alt={carName}
                fill
                className="object-cover"
                priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {car.images && car.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {car.images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === index
                      ? 'border-teal-500 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                      src={getImageUrl(img)}
                      alt={`${carName} ${index + 1}`}
                    fill
                    className="object-cover"
                      unoptimized
                  />
                </button>
              ))}
            </div>
            )}

            {/* Car Details */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-2 border-gray-200/50">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent mb-6 font-[var(--font-poppins)]">
                {carName}
              </h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 hover:shadow-lg transition-all">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Année</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{car.year}</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 hover:shadow-lg transition-all">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Kilométrage</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{car.km.toLocaleString()} km</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 hover:shadow-lg transition-all">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Statut</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {car.status === 'no_proccess' ? 'Non traité' :
                     car.status === 'en_attente' ? 'En attente' :
                     car.status === 'actif' ? 'Actif' :
                     car.status === 'sold' ? 'Vendu' : car.status}
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:shadow-lg transition-all">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Prix</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{car.price.toLocaleString()} DA</p>
                </div>
              </div>

              {/* Show finished appointments with images and PDF */}
              {carAppointments.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-3xl shadow-2xl p-8 border-2 border-purple-200/50 mt-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6 font-[var(--font-poppins)] flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Rapport de vérification
                </h2>
                  
                  {carAppointments.map((appointment: any, idx: number) => (
                    <div key={idx} className="mb-8 last:mb-0 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-200/50">
                      {appointment.id_workshop && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border border-purple-200">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Atelier de vérification</p>
                          <p className="text-lg font-bold text-gray-900">{appointment.id_workshop.name || 'Atelier'}</p>
                        </div>
                      )}
                      
                      {/* Images */}
                      {appointment.images && appointment.images.length > 0 && (
                        <div className="mb-6">
                          <p className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Images de vérification ({appointment.images.length})
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            {appointment.images.map((image: string, imgIdx: number) => (
                              <div key={imgIdx} className="relative h-40 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                                <Image
                                  src={getImageUrl(image) || image}
                                  alt={`Image de vérification ${imgIdx + 1}`}
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PDF Report */}
                      {appointment.rapport_pdf && (
                        <div>
                          <p className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Rapport PDF
                          </p>
                          <a
                            href={getImageUrl(appointment.rapport_pdf) || appointment.rapport_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Voir le rapport PDF
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Price and Contact */}
          <div className="lg:col-span-1">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-2 border-gray-200/50 sticky top-24 space-y-6">
              <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200">
                <p className="text-sm text-gray-600 mb-2 font-medium">Prix</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                  {car.price.toLocaleString()} DA
                </p>
              </div>

              {owner && (
              <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-teal-700 bg-clip-text text-transparent mb-4 font-[var(--font-poppins)]">
                  Vendeur
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 hover:shadow-lg transition-all">
                      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {owner.firstName[0]}{owner.lastName[0]}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {owner.firstName} {owner.lastName}
                        </p>
                        <p className="text-sm text-gray-600">Vendeur vérifié</p>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {owner && !isOwner && (
                <>
              {!showContact ? (
                <button
                  onClick={() => setShowContact(true)}
                      className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 mt-6 flex items-center justify-center gap-2"
                >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                  Contacter le vendeur
                </button>
              ) : (
                    <div className="space-y-3 pt-4 border-t border-gray-200 mt-6">
                  <a
                        href={`tel:${owner.phone}`}
                        className="block w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl text-center flex items-center justify-center gap-2"
                  >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {owner.phone}
                  </a>
                  <a
                        href={`mailto:${owner.email}`}
                        className="block w-full py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-all duration-200 text-center border-2 border-gray-200 hover:border-teal-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Envoyer un email
                      </a>
                      
                      {/* Chat Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Chat</h4>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3 h-48 overflow-y-auto space-y-2">
                          {chatMessages.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-4">Aucun message. Commencez la conversation !</p>
                          ) : (
                            chatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  msg.sender === 'me' 
                                    ? 'bg-teal-500 text-white' 
                                    : 'bg-white text-gray-700 border border-gray-200'
                                }`}>
                                  <p className="text-sm">{msg.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (chatMessage.trim()) {
                            setChatMessages([...chatMessages, {
                              sender: 'me',
                              message: chatMessage,
                              timestamp: new Date()
                            }]);
                            setChatMessage('');
                            // Simulate response (in real app, this would be sent to backend)
                            setTimeout(() => {
                              setChatMessages(prev => [...prev, {
                                sender: 'seller',
                                message: 'Merci pour votre message. Je vous répondrai bientôt !',
                                timestamp: new Date()
                              }]);
                            }, 1000);
                          }
                        }} className="flex gap-2">
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Tapez votre message..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            Envoyer
                          </button>
                        </form>
                      </div>
                </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  ⚠️ Ne partagez jamais vos informations personnelles avant de voir le véhicule
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
