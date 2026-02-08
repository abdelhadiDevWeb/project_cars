'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/utils/backend";

interface Car {
  _id: string;
  id?: string; // For compatibility
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number;
  status: 'no_proccess' | 'en_attente' | 'actif' | 'sold';
  images: string[];
  owner: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MyCarsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [editFormData, setEditFormData] = useState({
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);
  const [viewingCar, setViewingCar] = useState<Car | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  // Fetch cars from API
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch("/api/car/my-cars", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setError("Erreur serveur: réponse invalide. Vérifiez que le serveur backend est démarré.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setError(data?.message || "Erreur lors du chargement des voitures");
          setLoading(false);
          return;
        }

        // Map _id to id for compatibility
        const carsWithId = (data.cars || []).map((car: any) => ({
          ...car,
          id: car._id || car.id,
        }));
        setMyCars(carsWithId);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cars:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
        setLoading(false);
      }
    };

    fetchCars();
  }, [router]);

  const filteredCars = filter === 'all' 
    ? myCars 
    : myCars.filter(car => car.status === filter);

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    setEditFormData({
      brand: car.brand,
      model: car.model,
      year: car.year.toString(),
      km: car.km.toString(),
      price: car.price.toString(),
    });
    setEditImages([]);
    setEditImagePreviews([]);
    setExistingImages(car.images || []);
    setImagesToDelete([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEditImages(files);
      
      // Create previews
      const previews = files.map(file => URL.createObjectURL(file));
      setEditImagePreviews(previews);
    }
  };

  const removeImagePreview = (index: number) => {
    setEditImages(editImages.filter((_, i) => i !== index));
    setEditImagePreviews(editImagePreviews.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imagePath: string) => {
    setImagesToDelete([...imagesToDelete, imagePath]);
    setExistingImages(existingImages.filter(img => img !== imagePath));
  };

  const restoreExistingImage = (imagePath: string) => {
    setImagesToDelete(imagesToDelete.filter(img => img !== imagePath));
    setExistingImages([...existingImages, imagePath]);
  };

  const handleUpdate = async (carId: string) => {
    setIsUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // If images are being updated or deleted, use FormData
      if (editImages.length > 0 || imagesToDelete.length > 0) {
        const formData = new FormData();
        formData.append('brand', editFormData.brand);
        formData.append('model', editFormData.model);
        formData.append('year', editFormData.year);
        formData.append('km', editFormData.km);
        formData.append('price', editFormData.price);
        
        // Add new images
        editImages.forEach((image) => {
          formData.append('images', image);
        });

        // Add images to delete (always send, even if empty array)
        formData.append('imagesToDelete', JSON.stringify(imagesToDelete));

        // Add existing images to keep (always send, even if empty array)
        formData.append('existingImages', JSON.stringify(existingImages));

        const res = await fetch(`/api/car/update/${carId}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        });

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setError("Erreur serveur: réponse invalide. Vérifiez que le serveur backend est démarré.");
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
        setMyCars(myCars.map(car => 
          (car._id || car.id) === carId ? { ...car, ...data.car, id: data.car._id || data.car.id, _id: data.car._id || car._id } : car
        ));
        setEditingCar(null);
        setEditImages([]);
        setEditImagePreviews([]);
        setExistingImages([]);
        setImagesToDelete([]);
        setIsUpdating(false);
        return;
      }

      // No images to update or delete, use JSON
      const res = await fetch(`/api/car/update/${carId}`, {
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
        setError("Erreur serveur: réponse invalide. Vérifiez que le serveur backend est démarré.");
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
      setMyCars(myCars.map(car => 
        (car._id || car.id) === carId ? { ...car, ...data.car, id: data.car._id || data.car.id, _id: data.car._id || car._id } : car
      ));
      setEditingCar(null);
      setEditImages([]);
      setEditImagePreviews([]);
      setExistingImages([]);
      setImagesToDelete([]);
      setIsUpdating(false);
    } catch (error) {
      console.error('Error updating car:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsUpdating(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDelete = async (carId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette voiture ?")) {
      return;
    }

    setDeletingCarId(carId);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/car/delete/${carId}`, {
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
        setError("Erreur serveur: réponse invalide. Vérifiez que le serveur backend est démarré.");
        setDeletingCarId(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Erreur lors de la suppression");
        setDeletingCarId(null);
        return;
      }

      // Remove from local state
      setMyCars(myCars.filter(car => (car._id || car.id) !== carId));
      setDeletingCarId(null);
    } catch (error) {
      console.error('Error deleting car:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setDeletingCarId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'no_proccess':
        return 'Non traité';
      case 'en_attente':
        return 'En attente';
      case 'actif':
        return 'Actif';
      case 'sold':
        return 'Vendu';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'no_proccess':
        return 'bg-gray-500 text-white';
      case 'en_attente':
        return 'bg-yellow-500 text-white';
      case 'actif':
        return 'bg-green-500 text-white';
      case 'sold':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Mes voitures</h1>
          <p className="text-gray-600">Gérez toutes vos annonces de véhicules</p>
        </div>
        <Link
          href="/dashboard-seller/add-car"
          className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une voiture
        </Link>
      </div>
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'all', label: 'Toutes', count: myCars.length },
              { value: 'no_proccess', label: 'Non traité', count: myCars.filter(c => c.status === 'no_proccess').length },
              { value: 'en_attente', label: 'En attente', count: myCars.filter(c => c.status === 'en_attente').length },
              { value: 'actif', label: 'Actives', count: myCars.filter(c => c.status === 'actif').length },
              { value: 'sold', label: 'Vendues', count: myCars.filter(c => c.status === 'sold').length },
            ].map((filterOption) => (
              <button
                key={filterOption.value}
                onClick={() => setFilter(filterOption.value)}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  filter === filterOption.value
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-600">Chargement de vos voitures...</p>
          </div>
        ) : (
          <>
            {/* Cars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCars.map((car) => (
                <div key={car._id || car.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all">
                  <div className="relative h-48">
                    {car.images && car.images.length > 0 && getImageUrl(car.images[0]) ? (
                      <Image
                        src={getImageUrl(car.images[0])!}
                        alt={`${car.brand} ${car.model}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="ml-2 text-gray-500 text-sm">Aucune image</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(car.status)}`}>
                        {getStatusLabel(car.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">
                      {car.brand} {car.model} {car.year}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-gray-600 text-sm">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {car.km.toLocaleString()} km
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {car.year}
                      </span>
                    </div>
                    
                    <div className="text-2xl font-bold text-teal-600 font-[var(--font-poppins)]">
                      {car.price.toLocaleString()} DA
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setViewingCar(car);
                          setSelectedImageIndex(0);
                        }}
                        className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors text-center text-sm"
                      >
                        Voir
                      </button>
                      <button 
                        onClick={() => handleEdit(car)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-sm"
                      >
                        Modifier
                      </button>
                      <button 
                        onClick={() => handleDelete(car._id || car.id)}
                        disabled={deletingCarId === (car._id || car.id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingCarId === (car._id || car.id) ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Modal */}
            {editingCar && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">
                      Modifier la voiture
                    </h2>
                    <button
                      onClick={() => setEditingCar(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marque *
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Modèle *
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Année *
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kilométrage (km) *
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prix (DA) *
                        </label>
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

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Images existantes
                        </label>
                        {existingImages.length > 0 ? (
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            {existingImages.map((imagePath, index) => (
                              <div key={index} className="relative group">
                                <Image
                                  src={getImageUrl(imagePath) || '/images/car1.png'}
                                  alt={`Image ${index + 1}`}
                                  width={100}
                                  height={100}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300"
                                  unoptimized
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExistingImage(imagePath)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Supprimer cette image"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mb-4">Aucune image existante</p>
                        )}

                        {/* Images marked for deletion */}
                        {imagesToDelete.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Images à supprimer:</p>
                            <div className="flex flex-wrap gap-2">
                              {imagesToDelete.map((imagePath, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => restoreExistingImage(imagePath)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 flex items-center gap-1"
                                >
                                  <span>Image {index + 1}</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ajouter de nouvelles images
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Sélectionnez de nouvelles images à ajouter
                        </p>
                        
                        {/* New Image Previews */}
                        {editImagePreviews.length > 0 && (
                          <div className="mt-4 grid grid-cols-4 gap-4">
                            {editImagePreviews.map((preview, index) => (
                              <div key={index} className="relative">
                                <Image
                                  src={preview}
                                  alt={`Nouvelle image ${index + 1}`}
                                  width={100}
                                  height={100}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300"
                                  unoptimized
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImagePreview(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  title="Supprimer cette image"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => handleUpdate(editingCar._id || editingCar.id)}
                        disabled={isUpdating}
                        className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setEditingCar(null)}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Car Details Modal */}
            {viewingCar && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">
                      Détails de la voiture
                    </h2>
                    <button
                      onClick={() => setViewingCar(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Main Image with Navigation */}
                    <div className="relative h-64 lg:h-96 rounded-2xl overflow-hidden border border-gray-200">
                      {viewingCar.images && viewingCar.images.length > 0 && getImageUrl(viewingCar.images[selectedImageIndex]) ? (
                        <>
                          <Image
                            src={getImageUrl(viewingCar.images[selectedImageIndex])!}
                            alt={`${viewingCar.brand} ${viewingCar.model}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {/* Navigation Buttons */}
                          {viewingCar.images.length > 1 && (
                            <>
                              <button
                                onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + viewingCar.images.length) % viewingCar.images.length)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all"
                                aria-label="Image précédente"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % viewingCar.images.length)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all"
                                aria-label="Image suivante"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              {/* Image Counter */}
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                                {selectedImageIndex + 1} / {viewingCar.images.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="ml-2 text-gray-500 text-sm">Aucune image</span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Images */}
                    {viewingCar.images && viewingCar.images.length > 1 && viewingCar.images.some(img => getImageUrl(img)) && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {viewingCar.images
                          .filter(img => getImageUrl(img))
                          .map((img: string, index: number) => {
                            const imgUrl = getImageUrl(img);
                            if (!imgUrl) return null;
                            return (
                              <button
                                key={index}
                                onClick={() => setSelectedImageIndex(viewingCar.images.indexOf(img))}
                                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                                  selectedImageIndex === viewingCar.images.indexOf(img)
                                    ? 'border-teal-500 scale-105'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <Image
                                  src={imgUrl}
                                  alt={`${viewingCar.brand} ${viewingCar.model} ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </button>
                            );
                          })}
                      </div>
                    )}

                    {/* Car Information */}
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                      <h3 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)]">
                        {viewingCar.brand} {viewingCar.model} {viewingCar.year}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Année</p>
                          <p className="text-lg font-semibold text-gray-900">{viewingCar.year}</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Kilométrage</p>
                          <p className="text-lg font-semibold text-gray-900">{viewingCar.km.toLocaleString()} km</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Statut</p>
                          <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold ${getStatusColor(viewingCar.status)}`}>
                            {getStatusLabel(viewingCar.status)}
                          </span>
                        </div>
                        <div className="p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Prix</p>
                          <p className="text-lg font-semibold text-teal-600">{viewingCar.price.toLocaleString()} DA</p>
                        </div>
                      </div>

                      {viewingCar.createdAt && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Date de création: {new Date(viewingCar.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => {
                          setViewingCar(null);
                          handleEdit(viewingCar);
                        }}
                        className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          setViewingCar(null);
                          handleDelete(viewingCar._id || viewingCar.id);
                        }}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Supprimer
                      </button>
                      <button
                        onClick={() => setViewingCar(null)}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {filteredCars.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
            <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
            <p className="text-gray-600 mb-4">Aucune voiture trouvée</p>
            <Link
              href="/dashboard-seller/add-car"
              className="inline-block px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors"
            >
              Ajouter votre première voiture
            </Link>
          </div>
        )}
    </div>
  );
}
