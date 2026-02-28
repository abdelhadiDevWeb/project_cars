'use client';

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface CarVerification {
  ok: boolean;
  verified: boolean;
  car?: {
    _id: string;
    id: string;
    brand: string;
    model: string;
    year: number;
    status: string;
  };
  message: string;
}

export default function VerifyCarPage() {
  const params = useParams();
  const carId = params?.id as string;
  const [verification, setVerification] = useState<CarVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkVerification = async () => {
      if (!carId) {
        setError("ID de voiture manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/car/verify/${carId}`);
        const data = await res.json();
        
        if (res.ok && data.ok) {
          setVerification(data);
        } else {
          setError(data?.message || "Erreur lors de la vérification");
          setVerification(data);
        }
      } catch (err) {
        console.error('Error checking verification:', err);
        setError("Erreur de connexion. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [carId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-200">
        {/* Header */}
        <div className={`p-8 text-center ${
          verification?.verified 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
            : 'bg-gradient-to-r from-red-500 to-rose-500'
        }`}>
          {verification?.verified ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white font-[var(--font-poppins)]">Véhicule Vérifié</h1>
              <p className="text-white/90 text-lg">Ce véhicule a été vérifié par un atelier certifié</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white font-[var(--font-poppins)]">Non Vérifié</h1>
              <p className="text-white/90 text-lg">
                {verification?.message || "Ce véhicule n'a pas été vérifié"}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {verification?.car ? (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Informations du véhicule</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Marque</span>
                    <span className="text-gray-900 font-semibold">{verification.car.brand}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Modèle</span>
                    <span className="text-gray-900 font-semibold">{verification.car.model}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 font-medium">Année</span>
                    <span className="text-gray-900 font-semibold">{verification.car.year}</span>
                  </div>
                </div>
              </div>

              {verification.verified && (
                <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 mb-2">Statut de vérification</h3>
                      <p className="text-green-800">
                        Ce véhicule a été inspecté et vérifié par un atelier certifié. 
                        Tous les documents et rapports de vérification sont disponibles.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg">{error || verification?.message || "Véhicule non trouvé"}</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold transition-all text-center shadow-lg hover:shadow-xl"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
