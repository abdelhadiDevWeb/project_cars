'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCarPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
    vin: '',
    color: '',
    ports: '',
    boite: '',
    type_gaz: '',
    type_enegine: '',
    description: '',
    accident: false,
    usedby: '',
  });
  const [vinValidating, setVinValidating] = useState(false);
  const [vinValid, setVinValid] = useState<boolean | null>(null);
  const [vinError, setVinError] = useState('');
  const [vinRemark, setVinRemark] = useState('');
  const [vinDetails, setVinDetails] = useState<any>(null);
  const [customBrand, setCustomBrand] = useState('');
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [bypassVin, setBypassVin] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Ensure value is always a string, never undefined
    const stringValue = value ?? '';
    
    if (name === 'brand') {
      if (stringValue === 'other') {
        setShowCustomBrand(true);
        setFormData({
          ...formData,
          brand: '',
        });
      } else {
        setShowCustomBrand(false);
        setCustomBrand('');
        setFormData({
          ...formData,
          brand: stringValue,
        });
      }
    } else if (name === 'price') {
      // Validate price: must be at least 200000
      const numValue = parseFloat(stringValue);
      if (stringValue !== '' && (!isNaN(numValue) && numValue < 200000)) {
        setError('Le prix minimum est de 200,000.00 DA');
      } else {
        setError('');
      }
      setFormData({
        ...formData,
        [name]: stringValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: stringValue,
      });
    }
    
    // Clear error when user changes brand or model (they might be fixing the mismatch)
    if ((name === 'brand' || name === 'model') && error) {
      setError('');
    }
  };

  const handleCustomBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';
    setCustomBrand(value);
    setFormData({
      ...formData,
      brand: value,
    });
    // Clear error when user changes custom brand
    if (error) {
      setError('');
    }
  };

  const handleVinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vin = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
    setFormData({ ...formData, vin });
    setVinError('');
    setVinValid(null);
    setVinRemark('');
    setVinDetails(null);
    setBypassVin(false); // Reset bypass when VIN changes

    if (vin.length === 17) {
      setVinValidating(true);
      setVinError('');
      setVinValid(null);
      setVinRemark('');
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setVinValid(false);
          setVinError('Vous devez être connecté pour vérifier le VIN.');
          setVinValidating(false);
          return;
        }

        const response = await fetch('/api/car/verify-vin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ vin }),
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          // If response is not JSON, try to get text
          const text = await response.text();
          setVinValid(false);
          setVinError(`Erreur serveur: ${response.status} ${response.statusText || text || 'Réponse invalide'}`);
          setVinValidating(false);
          return;
        }

        // Check if response is OK and VIN is valid
        if (response.ok && data.ok && data.valid) {
          setVinValid(true);
          setVinError('');
          setVinRemark(data.remark || 'VIN vérifié');
          setVinDetails(data.details || null);
        } else {
          // VIN is invalid or doesn't exist
          setVinValid(false);
          let errorMessage = 'VIN invalide ou non trouvé. Veuillez vérifier le numéro.';
          
          // Handle different error formats from API
          if (data.message) {
            if (typeof data.message === 'string') {
              errorMessage = data.message;
            } else if (typeof data.message === 'object') {
              if (data.message.error && typeof data.message.error === 'string') {
                errorMessage = data.message.error;
              } else if (data.message.message && typeof data.message.message === 'string') {
                errorMessage = data.message.message;
              }
            }
          } else if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (typeof data.error === 'object') {
              if (data.error.message && typeof data.error.message === 'string') {
                errorMessage = data.error.message;
              } else if (data.error.error && typeof data.error.error === 'string') {
                errorMessage = data.error.error;
              }
            }
          }
          
          // If status is 400 or 404, it means VIN doesn't exist or is invalid
          if (response.status === 400 || response.status === 404) {
            if (!errorMessage.includes('VIN') && !errorMessage.includes('vin')) {
              errorMessage = `VIN invalide ou non trouvé. ${errorMessage}`;
            }
          }
          
          setVinError(errorMessage);
          setVinRemark('');
          setVinDetails(null);
        }
      } catch (error: any) {
        console.error('Error verifying VIN:', error);
        setVinValid(false);
        setVinError(error?.message || 'Erreur de connexion lors de la vérification du VIN. Veuillez réessayer.');
        setVinRemark('');
        setVinDetails(null);
      } finally {
        setVinValidating(false);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 10 images
      if (files.length > 10) {
        setError('Vous ne pouvez télécharger que 10 images maximum');
        return;
      }
      // Validate file sizes (5MB max per file)
      const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        setError('Certains fichiers dépassent 5MB. Veuillez réduire leur taille.');
        return;
      }
      setImages(files);
      setError('');
    }
  };

  // Function to normalize strings for comparison (remove spaces, lowercase, remove special chars)
  const normalizeString = (str: string): string => {
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  };

  // Function to check if brand/model match VIN data
  const checkBrandModelMatch = (brand: string, model: string): { match: boolean; error?: string } => {
    if (!vinDetails || !vinValid) {
      return { match: true }; // If no VIN validation, allow submission
    }

    const normalizedBrand = normalizeString(brand);
    const normalizedModel = normalizeString(model);
    const normalizedVinMake = normalizeString(vinDetails.make || '');
    const normalizedVinModel = normalizeString(vinDetails.model || '');

    // Check if brand matches make
    const brandMatch = normalizedBrand === normalizedVinMake || 
                       normalizedVinMake.includes(normalizedBrand) || 
                       normalizedBrand.includes(normalizedVinMake);

    // Check if model matches
    const modelMatch = normalizedModel === normalizedVinModel || 
                       normalizedVinModel.includes(normalizedModel) || 
                       normalizedModel.includes(normalizedVinModel);

    if (!brandMatch || !modelMatch) {
      let errorDetails = [];
      if (!brandMatch) {
        errorDetails.push(`La marque "${brand}" ne correspond pas à "${vinDetails.make}" du VIN`);
      }
      if (!modelMatch) {
        errorDetails.push(`Le modèle "${model}" ne correspond pas à "${vinDetails.model}" du VIN`);
      }
      return {
        match: false,
        error: `Les informations du véhicule ne correspondent pas au VIN vérifié.\n\n${errorDetails.join('\n')}\n\nVIN vérifié: ${vinDetails.make} ${vinDetails.model}${vinDetails.year ? ` (${vinDetails.year})` : ''}`
      };
    }

    return { match: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    const finalBrand = showCustomBrand ? customBrand.trim() : formData.brand;
    if (!finalBrand || !formData.model || !formData.year || !formData.km || !formData.price) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validate price: must be at least 200000
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 200000) {
      setError('Le prix minimum est de 200,000.00 DA');
      return;
    }

    // Validate VIN if provided (unless bypass is enabled)
    if (formData.vin && formData.vin.length === 17 && !bypassVin) {
      if (vinValid === false || vinValidating) {
        setError('Veuillez vérifier que le VIN est valide avant de continuer');
        return;
      }
      if (vinValid === null) {
        setError('Veuillez attendre la vérification du VIN');
        return;
      }

      // Check if brand and model match VIN data
      const matchResult = checkBrandModelMatch(finalBrand, formData.model);
      if (!matchResult.match) {
        setError(matchResult.error || 'Les informations du véhicule ne correspondent pas au VIN vérifié');
        return;
      }
    }

    if (images.length === 0) {
      setError('Veuillez télécharger au moins une image');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      console.log("🔑 Frontend - Token from localStorage:", token ? "Present" : "Missing");
      
      if (!token) {
        setError('Vous devez être connecté pour ajouter une voiture');
        setIsSubmitting(false);
        router.push('/login');
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('brand', finalBrand);
      formDataToSend.append('model', formData.model);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('km', formData.km);
      formDataToSend.append('price', formData.price);
      if (formData.vin && formData.vin.length === 17) {
        formDataToSend.append('vin', formData.vin);
        if (bypassVin) {
          formDataToSend.append('bypassVin', 'true');
        }
      }
      // Add new optional fields
      if (formData.color) formDataToSend.append('color', formData.color);
      if (formData.ports) formDataToSend.append('ports', formData.ports);
      if (formData.boite) formDataToSend.append('boite', formData.boite);
      if (formData.type_gaz) formDataToSend.append('type_gaz', formData.type_gaz);
      if (formData.type_enegine) formDataToSend.append('type_enegine', formData.type_enegine);
      if (formData.description) formDataToSend.append('description', formData.description);
      formDataToSend.append('accident', formData.accident ? 'true' : 'false');
      if (formData.usedby) formDataToSend.append('usedby', formData.usedby);
      // Status is not sent - backend will set default to 'no_proccess'

      // Append images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      console.log("📤 Frontend - Sending request to /api/car/create");
      console.log("📤 Frontend - FormData entries:", {
        brand: finalBrand,
        model: formData.model,
        year: formData.year,
        km: formData.km,
        price: formData.price,
        imagesCount: images.length,
      });

      const res = await fetch("/api/car/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary for FormData
        },
        body: formDataToSend,
      });

      console.log("📥 Frontend - Response status:", res.status);

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors de l'ajout de la voiture");
        setIsSubmitting(false);
        return;
      }

      // Success - show success message
      setSuccessMessage("Voiture ajoutée avec succès!");
      setIsSubmitting(false);
      
      // Reset form
      setFormData({
        brand: '',
        model: '',
        year: '',
        km: '',
        price: '',
        vin: '',
        color: '',
        ports: '',
        boite: '',
        type_gaz: '',
        type_enegine: '',
        description: '',
        accident: false,
        usedby: '',
      });
      setCustomBrand('');
      setShowCustomBrand(false);
      setImages([]);
      setVinValid(null);
      setVinError('');
      setVinRemark('');
      
      // Redirect after 2 seconds
      setTimeout(() => {
      router.push('/dashboard-seller/my-cars');
      }, 2000);
    } catch (error) {
      console.error('Error adding car:', error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Ajouter une voiture</h1>
        <p className="text-gray-600">Remplissez les informations de votre véhicule</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-xl shadow-sm" role="alert">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-900 mb-1">Erreur de validation</p>
                <div className="text-sm text-red-800 whitespace-pre-line leading-relaxed">{error}</div>
              </div>
              <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between" role="alert">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Informations de base</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                  Marque *
                </label>
                <select
                  id="brand"
                  name="brand"
                  required
                  value={showCustomBrand ? 'other' : formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Sélectionner une marque</option>
                  <option value="Volkswagen">Volkswagen</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="Renault">Renault</option>
                  <option value="Peugeot">Peugeot</option>
                  <option value="BMW">BMW</option>
                  <option value="Mercedes">Mercedes</option>
                  <option value="Audi">Audi</option>
                  <option value="Toyota">Toyota</option>
                  <option value="other">Autre</option>
                </select>
                {showCustomBrand && (
                  <input
                    type="text"
                    id="customBrand"
                    name="customBrand"
                    required
                    value={customBrand}
                    onChange={handleCustomBrandChange}
                    placeholder="Entrez le nom de la marque"
                    className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                )}
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle *
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  required
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: Golf, Tucson, Clio"
                />
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                  Année *
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  required
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Prix (DA) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="200000"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    formData.price && parseFloat(formData.price) < 200000
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Ex: 2200000"
                />
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-gray-500">Format:</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {formData.price || '0'},00 DA
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Prix minimum: 200,000.00 DA
                </p>
                {formData.price && parseFloat(formData.price) < 200000 && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    Le prix doit être d'au moins 200,000.00 DA
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="km" className="block text-sm font-medium text-gray-700 mb-2">
                  Kilométrage (km) *
                </label>
                <input
                  type="number"
                  id="km"
                  name="km"
                  required
                  min="0"
                  value={formData.km}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: 80000"
                />
              </div>

              <div>
                <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-2">
                  VIN (Numéro d'identification du véhicule)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="vin"
                    name="vin"
                    value={formData.vin}
                    onChange={handleVinChange}
                    maxLength={17}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 uppercase transition-colors ${
                      vinValid === false 
                        ? 'border-orange-500 bg-orange-50 focus:border-orange-500 focus:ring-orange-500' 
                        : vinValid === true 
                        ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500' 
                        : 'border-gray-300'
                    }`}
                    placeholder="Ex: 1HGBH41JXMN109186"
                  />
                  {vinValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-teal-500"></div>
                    </div>
                  )}
                  {vinValid === true && !vinValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {vinValid === false && !vinValidating && formData.vin.length === 17 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {vinValidating && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-teal-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-teal-500"></div>
                    <span>Vérification du VIN en cours...</span>
                  </div>
                )}
                {vinError && vinValid === false && !vinValidating && !bypassVin && (
                  <div className="mt-2 p-4 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl shadow-sm animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 mb-1">VIN invalide ou non trouvé</p>
                        <p className="text-sm text-red-800 leading-relaxed mb-3">{vinError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBypassVin(true);
                            setError('');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Créer quand même (VIN non vérifié)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {bypassVin && vinValid === false && (
                  <div className="mt-2 p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-900">Mode contournement activé</p>
                        <p className="text-sm text-orange-800">Le véhicule sera créé sans vérification du VIN</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBypassVin(false)}
                        className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
                {vinValid === true && !vinValidating && (
                  <div className="mt-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900 mb-2">VIN valide et vérifié ✓</p>
                        {vinRemark && (
                          <p className="text-sm text-green-800 font-semibold mb-3">{vinRemark}</p>
                        )}
                        {vinDetails && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-xs font-semibold text-green-900 mb-2 uppercase tracking-wide">Détails du véhicule :</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {vinDetails.make && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Marque:</span>
                                  <span className="text-green-900">{vinDetails.make}</span>
                                </div>
                              )}
                              {vinDetails.model && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Modèle:</span>
                                  <span className="text-green-900">{vinDetails.model}</span>
                                </div>
                              )}
                              {vinDetails.year && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Année:</span>
                                  <span className="text-green-900">{vinDetails.year}</span>
                                </div>
                              )}
                              {vinDetails.bodyType && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Type:</span>
                                  <span className="text-green-900">{vinDetails.bodyType}</span>
                                </div>
                              )}
                              {vinDetails.engine && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Moteur:</span>
                                  <span className="text-green-900">{vinDetails.engine}</span>
                                </div>
                              )}
                              {vinDetails.transmission && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Transmission:</span>
                                  <span className="text-green-900">{vinDetails.transmission}</span>
                                </div>
                              )}
                              {vinDetails.driveType && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Traction:</span>
                                  <span className="text-green-900">{vinDetails.driveType}</span>
                                </div>
                              )}
                              {vinDetails.fuelType && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Carburant:</span>
                                  <span className="text-green-900">{vinDetails.fuelType}</span>
                                </div>
                              )}
                              {vinDetails.doors && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Portes:</span>
                                  <span className="text-green-900">{vinDetails.doors}</span>
                                </div>
                              )}
                              {vinDetails.seats && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Places:</span>
                                  <span className="text-green-900">{vinDetails.seats}</span>
                                </div>
                              )}
                              {vinDetails.color && (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 font-medium min-w-[80px]">Couleur:</span>
                                  <span className="text-green-900">{vinDetails.color}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {formData.vin.length > 0 && formData.vin.length < 17 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.vin.length}/17 caractères
                  </p>
                )}
                {formData.vin.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">17 caractères alphanumériques (sans I, O, Q)</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Informations supplémentaires</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur
                </label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={formData.color ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: Noir, Blanc, Rouge"
                />
              </div>

              <div>
                <label htmlFor="ports" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de portes
                </label>
                <input
                  type="number"
                  id="ports"
                  name="ports"
                  min="2"
                  max="6"
                  value={formData.ports ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: 3, 4, 5"
                />
              </div>

              <div>
                <label htmlFor="boite" className="block text-sm font-medium text-gray-700 mb-2">
                  Boîte de vitesses
                </label>
                <select
                  id="boite"
                  name="boite"
                  value={formData.boite ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="manuelle">Manuelle</option>
                  <option value="auto">Automatique</option>
                  <option value="semi-auto">Semi-automatique</option>
                </select>
              </div>

              <div>
                <label htmlFor="type_gaz" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de carburant
                </label>
                <select
                  id="type_gaz"
                  name="type_gaz"
                  value={formData.type_gaz ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="diesel">Diesel</option>
                  <option value="gaz">Gaz</option>
                  <option value="essence">Essence</option>
                  <option value="electrique">Électrique</option>
                </select>
              </div>

              <div>
                <label htmlFor="type_enegine" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de moteur
                </label>
                <input
                  type="text"
                  id="type_enegine"
                  name="type_enegine"
                  value={formData.type_enegine ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: 1.6L, 2.0L Turbo"
                />
              </div>

              <div>
                <label htmlFor="usedby" className="block text-sm font-medium text-gray-700 mb-2">
                  Utilisé par
                </label>
                <input
                  type="text"
                  id="usedby"
                  name="usedby"
                  value={formData.usedby ?? ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: Particulier, Professionnel"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="accident"
                    name="accident"
                    checked={formData.accident}
                    onChange={(e) => setFormData({ ...formData, accident: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Le véhicule a été impliqué dans un accident
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description ?? ''}
                  onChange={handleChange}
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  placeholder="Décrivez votre véhicule (état, équipements, historique, etc.)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(formData.description || '').length}/2000 caractères
                </p>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">Photos *</h2>
            <p className="text-sm text-gray-600 mb-4">Téléchargez au moins une image (maximum 10 images, 5MB par image)</p>
            <div className="mb-4">
              <label className="block w-full px-6 py-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors text-center">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="space-y-2">
                  <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Cliquez pour télécharger ou glissez-déposez
                  </p>
                  <p className="text-xs text-gray-500">JPEG, PNG, WEBP, GIF jusqu&apos;à 5MB par image</p>
                </div>
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <Image
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImages(images.filter((_, i) => i !== index));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Publication en cours...</span>
                </>
              ) : (
                'Publier la voiture'
              )}
            </button>
            <Link
              href="/dashboard-seller/my-cars"
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
