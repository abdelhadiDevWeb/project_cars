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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <nav className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <Image
                  src="/logo.png"
                  alt="CarSure DZ Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold text-blue-900 font-[var(--font-poppins)]">
                CarSure DZ
              </span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-teal-600 transition-colors font-medium"
            >
              ← Retour
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
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
              <h1 className="text-3xl font-bold text-blue-900 mb-4 font-[var(--font-poppins)]">
                {carName}
              </h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Année</p>
                  <p className="text-lg font-semibold text-blue-900">{car.year}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Kilométrage</p>
                  <p className="text-lg font-semibold text-blue-900">{car.km.toLocaleString()} km</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Statut</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {car.status === 'no_proccess' ? 'Non traité' :
                     car.status === 'en_attente' ? 'En attente' :
                     car.status === 'actif' ? 'Actif' :
                     car.status === 'sold' ? 'Vendu' : car.status}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Prix</p>
                  <p className="text-lg font-semibold text-blue-900">{car.price.toLocaleString()} DA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Price and Contact */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 sticky top-24 space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Prix</p>
                <p className="text-4xl font-bold text-blue-900 font-[var(--font-poppins)]">
                  {car.price.toLocaleString()} DA
                </p>
              </div>

              {owner && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 font-[var(--font-poppins)]">
                    Vendeur
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {owner.firstName[0]}{owner.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {owner.firstName} {owner.lastName}
                        </p>
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
                      className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors shadow-lg mt-6"
                    >
                      Contacter le vendeur
                    </button>
                  ) : (
                    <div className="space-y-3 pt-4 border-t border-gray-200 mt-6">
                      <a
                        href={`tel:${owner.phone}`}
                        className="block w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors shadow-lg text-center"
                      >
                        📞 {owner.phone}
                      </a>
                      <a
                        href={`mailto:${owner.email}`}
                        className="block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-center"
                      >
                        ✉️ Envoyer un email
                      </a>
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
