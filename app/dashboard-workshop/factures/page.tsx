'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

interface Facture {
  _id: string;
  id?: string;
  id_user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  service: 'mécanique' | 'vérification peinture' | 'mécanique & peinture';
  total: number;
  date: string;
  createdAt: string;
}

export default function FacturesPage() {
  const { user, token } = useUser();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFactures = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/facture', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          setError("Erreur serveur: réponse invalide");
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (res.ok && data.ok) {
          setFactures(data.factures || []);
        } else {
          setError(data?.message || "Erreur lors du chargement des factures");
        }
      } catch (error) {
        console.error('Error fetching factures:', error);
        setError("Erreur de connexion. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchFactures();
    }
  }, [user, token]);

  const handlePrint = (facture: Facture) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture #${facture._id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #333;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-box {
              flex: 1;
            }
            .info-box h3 {
              margin-top: 0;
              color: #555;
              border-bottom: 2px solid #ddd;
              padding-bottom: 10px;
            }
            .info-box p {
              margin: 5px 0;
              color: #666;
            }
            .facture-details {
              margin: 30px 0;
            }
            .facture-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .facture-table th,
            .facture-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .facture-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #333;
            }
            .total-section {
              margin-top: 30px;
              text-align: right;
              padding-top: 20px;
              border-top: 2px solid #333;
            }
            .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-top: 10px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FACTURE</h1>
            <p>CarSure DZ</p>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <h3>Atelier</h3>
              <p><strong>${user?.name || 'Atelier'}</strong></p>
              <p>${user?.email || ''}</p>
              <p>${user?.phone || ''}</p>
              <p>${user?.adr || ''}</p>
            </div>
            <div class="info-box">
              <h3>Client</h3>
              <p><strong>${facture.id_user.firstName} ${facture.id_user.lastName}</strong></p>
              <p>${facture.id_user.email}</p>
              <p>${facture.id_user.phone}</p>
            </div>
          </div>

          <div class="facture-details">
            <p><strong>Date:</strong> ${new Date(facture.date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</p>
            <p><strong>Numéro de facture:</strong> #${facture._id.substring(0, 8).toUpperCase()}</p>
          </div>

          <table class="facture-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${facture.service}</td>
                <td style="text-align: right;">${facture.total.toLocaleString()} DA</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <p><strong>Total:</strong></p>
            <div class="total-amount">${facture.total.toLocaleString()} DA</div>
          </div>

          <div class="footer">
            <p>Merci pour votre confiance!</p>
            <p>CarSure DZ - Votre plateforme de confiance</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2 flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Mes Factures
        </h1>
        <p className="text-gray-600">Gérez et imprimez toutes vos factures</p>
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

      {factures.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-500">Aucune facture pour le moment</p>
          <p className="text-sm text-gray-400 mt-2">Les factures seront créées automatiquement lors de la finalisation des vérifications</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Service</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Total</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {factures.map((facture) => (
                  <tr key={facture._id || facture.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(facture.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {facture.id_user.firstName} {facture.id_user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{facture.id_user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        facture.service === 'mécanique'
                          ? 'bg-blue-100 text-blue-700'
                          : facture.service === 'vérification peinture'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {facture.service}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {facture.total.toLocaleString()} DA
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handlePrint(facture)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
