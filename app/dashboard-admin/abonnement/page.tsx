'use client';

import { useState, useEffect } from 'react';

interface TypeAbonnement {
  id: string;
  name: string;
  time: number;
  price: number;
  createdAt?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: boolean;
}

interface Workshop {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  status: boolean;
}

interface ClientAbonnement {
  id: string;
  type_abonnement: {
    id: string;
    name: string;
    time: number;
    price: number;
  };
  clientInfo: {
    id: string;
    name: string;
    email: string;
    phone: string;
    type: string;
    workshopType?: string;
  };
  date_start: string;
  date_end: string;
  price: number;
  createdAt: string;
}

export default function AbonnementPage() {
  const [types, setTypes] = useState<TypeAbonnement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [abonnements, setAbonnements] = useState<ClientAbonnement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showCreateAbonnementModal, setShowCreateAbonnementModal] = useState(false);
  
  const [newType, setNewType] = useState({ name: '', time: '', price: '' });
  const [bulkTypes, setBulkTypes] = useState([{ name: '', time: '', price: '' }]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedClient, setSelectedClient] = useState({ id: '', type: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [typesRes, usersRes, workshopsRes, abonnementsRes] = await Promise.all([
        fetch('/api/abonnement/types', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/abonnement/users/inactive', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/abonnement/workshops/inactive', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/abonnement/client', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        if (typesData.ok) {
          // Map _id to id for types if needed
          const typesWithId = (typesData.types || []).map((type: any) => ({
            ...type,
            id: type.id || type._id?.toString() || type._id,
          }));
          setTypes(typesWithId);
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.ok) {
          // Map _id to id for users if needed
          const usersWithId = (usersData.users || []).map((user: any) => ({
            ...user,
            id: user.id || user._id?.toString() || user._id,
          }));
          setUsers(usersWithId);
        }
      }

      if (workshopsRes.ok) {
        const workshopsData = await workshopsRes.json();
        if (workshopsData.ok) {
          // Map _id to id for workshops if needed
          const workshopsWithId = (workshopsData.workshops || []).map((workshop: any) => ({
            ...workshop,
            id: workshop.id || workshop._id?.toString() || workshop._id,
          }));
          setWorkshops(workshopsWithId);
        }
      }

      if (abonnementsRes.ok) {
        const abonnementsData = await abonnementsRes.json();
        if (abonnementsData.ok) {
          // Map _id to id for abonnements if needed
          const abonnementsWithId = (abonnementsData.abonnements || []).map((abonnement: any) => ({
            ...abonnement,
            id: abonnement.id || abonnement._id?.toString() || abonnement._id,
          }));
          setAbonnements(abonnementsWithId);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.name || !newType.time || !newType.price) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/abonnement/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newType.name,
          time: Number(newType.time),
          price: Number(newType.price),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setTypes([...types, data.type]);
        setNewType({ name: '', time: '', price: '' });
        setShowAddTypeModal(false);
        alert('Type d\'abonnement ajouté avec succès');
      } else {
        alert(data.message || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Error adding type:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddTypes = async (e: React.FormEvent) => {
    e.preventDefault();
    const validTypes = bulkTypes.filter(t => t.name && t.time && t.price);
    if (validTypes.length === 0) {
      alert('Veuillez remplir au moins un type d\'abonnement');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/abonnement/types/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          types: validTypes.map(t => ({
            name: t.name,
            time: Number(t.time),
            price: Number(t.price),
          })),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setTypes([...types, ...data.types]);
        setBulkTypes([{ name: '', time: '', price: '' }]);
        setShowBulkAddModal(false);
        alert(`${data.types.length} type(s) d'abonnement ajouté(s) avec succès`);
      } else {
        alert(data.message || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Error bulk adding types:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAbonnement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedClient.id || !selectedClient.type) {
      alert('Veuillez sélectionner un type d\'abonnement et un client');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/abonnement/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type_abonnement: selectedType,
          clientId: selectedClient.id,
          clientType: selectedClient.type,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        alert('Abonnement créé avec succès');
        setSelectedType('');
        setSelectedClient({ id: '', type: '' });
        setShowCreateAbonnementModal(false);
        // Refresh data
        fetchData();
      } else {
        alert(data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating abonnement:', error);
      alert('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBulkTypeField = () => {
    setBulkTypes([...bulkTypes, { name: '', time: '', price: '' }]);
  };

  const removeBulkTypeField = (index: number) => {
    setBulkTypes(bulkTypes.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-teal-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
              Gestion des Abonnements
            </h1>
            <p className="text-gray-600">
              Gérez les types d'abonnement et créez des abonnements pour les clients
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddTypeModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
            >
              + Ajouter un Type
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
            >
              + Ajouter Plusieurs Types
            </button>
          </div>
        </div>

        {/* Types Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                Types d'Abonnement ({types.length})
              </h2>
            </div>
            <div className="p-6">
              {types.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun type d'abonnement</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {types.map((type, index) => {
                    const typeId = type.id || (type as any)._id?.toString() || (type as any)._id;
                    return (
                      <div
                        key={typeId || `type-${index}`}
                        className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200 hover:border-teal-300 transition-all shadow-sm hover:shadow-md"
                      >
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{type.name}</h3>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Durée:</span> {type.time} jours
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Prix:</span> {type.price} DA
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inactive Users Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                Utilisateurs Inactifs ({users.length})
              </h2>
              {users.length > 0 && (
                <button
                  onClick={() => {
                    setShowCreateAbonnementModal(true);
                    setSelectedClient({ id: '', type: 'User' });
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
                >
                  Créer un Abonnement
                </button>
              )}
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun utilisateur inactif</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user, index) => {
                    const userId = user.id || (user as any)._id?.toString() || (user as any)._id;
                    return (
                      <div
                        key={userId || `user-${index}`}
                        className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md cursor-pointer"
                        onClick={() => {
                          if (userId) {
                            setSelectedClient({ id: userId, type: 'User' });
                            setShowCreateAbonnementModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{user.phone}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Abonnements Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)] flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Abonnements Actifs ({abonnements.length})
              </h2>
            </div>
            <div className="p-6">
              {abonnements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun abonnement actif</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type d'Abonnement</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date de Début</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date de Fin</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Prix</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {abonnements.map((abonnement, index) => {
                        const abonnementId = abonnement.id || `abonnement-${index}`;
                        const isExpired = new Date(abonnement.date_end) < new Date();
                        const isActive = new Date(abonnement.date_start) <= new Date() && !isExpired;
                        
                        return (
                          <tr key={abonnementId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                                  abonnement.clientInfo?.type === 'User'
                                    ? 'bg-gradient-to-br from-blue-500 to-teal-500'
                                    : 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                }`}>
                                  {abonnement.clientInfo?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {abonnement.clientInfo?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-600">{abonnement.clientInfo?.email || 'N/A'}</p>
                                  <p className="text-xs text-gray-500">{abonnement.clientInfo?.phone || 'N/A'}</p>
                                </div>
                              </div>
                              {abonnement.clientInfo && (
                                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                  abonnement.clientInfo.type === 'User'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {abonnement.clientInfo.type === 'User' ? 'Client' : 'Atelier'}
                                  {abonnement.clientInfo.workshopType && ` - ${abonnement.clientInfo.workshopType === 'mechanic' ? 'Mécanique' : 'Inspecteur'}`}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {abonnement.type_abonnement ? (
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {abonnement.type_abonnement.name}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {abonnement.type_abonnement.time} jours
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">N/A</p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-700">
                                {new Date(abonnement.date_start).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-700">
                                {new Date(abonnement.date_end).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {abonnement.price.toLocaleString('fr-FR')} DA
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isExpired
                                  ? 'bg-red-100 text-red-700'
                                  : isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {isExpired ? 'Expiré' : isActive ? 'Actif' : 'À venir'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inactive Workshops Section */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)]">
                Ateliers Inactifs ({workshops.length})
              </h2>
              {workshops.length > 0 && (
                <button
                  onClick={() => {
                    setShowCreateAbonnementModal(true);
                    setSelectedClient({ id: '', type: 'Workshop' });
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
                >
                  Créer un Abonnement
                </button>
              )}
            </div>
            <div className="p-6">
              {workshops.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun atelier inactif</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workshops.map((workshop, index) => {
                    const workshopId = workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id;
                    return (
                      <div
                        key={workshopId || `workshop-${index}`}
                        className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all shadow-sm hover:shadow-md cursor-pointer"
                        onClick={() => {
                          if (workshopId) {
                            setSelectedClient({ id: workshopId, type: 'Workshop' });
                            setShowCreateAbonnementModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {workshop.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{workshop.name}</p>
                            <p className="text-xs text-gray-600">{workshop.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{workshop.phone}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          workshop.type === 'mechanic' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {workshop.type === 'mechanic' ? 'Mécanique' : 'Inspecteur'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Type Modal */}
        {showAddTypeModal && (
          <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">
                Ajouter un Type d'Abonnement
              </h2>
              <form onSubmit={handleAddType} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={newType.time}
                    onChange={(e) => setNewType({ ...newType, time: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prix (DA)
                  </label>
                  <input
                    type="number"
                    value={newType.price}
                    onChange={(e) => setNewType({ ...newType, price: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                    min="0"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTypeModal(false);
                      setNewType({ name: '', time: '', price: '' });
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Add Types Modal */}
        {showBulkAddModal && (
          <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-2xl w-full p-8 border-2 border-gray-200/50 my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">
                Ajouter Plusieurs Types d'Abonnement
              </h2>
              <form onSubmit={handleBulkAddTypes} className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                  {bulkTypes.map((type, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700">Type {index + 1}</h3>
                        {bulkTypes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBulkTypeField(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Nom"
                          value={type.name}
                          onChange={(e) => {
                            const updated = [...bulkTypes];
                            updated[index].name = e.target.value;
                            setBulkTypes(updated);
                          }}
                          className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Durée (jours)"
                          value={type.time}
                          onChange={(e) => {
                            const updated = [...bulkTypes];
                            updated[index].time = e.target.value;
                            setBulkTypes(updated);
                          }}
                          className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                          min="1"
                        />
                        <input
                          type="number"
                          placeholder="Prix (DA)"
                          value={type.price}
                          onChange={(e) => {
                            const updated = [...bulkTypes];
                            updated[index].price = e.target.value;
                            setBulkTypes(updated);
                          }}
                          className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                          min="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addBulkTypeField}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  + Ajouter un autre type
                </button>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkAddModal(false);
                      setBulkTypes([{ name: '', time: '', price: '' }]);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Ajout...' : 'Ajouter Tous'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Abonnement Modal */}
        {showCreateAbonnementModal && (
          <div className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-[var(--font-poppins)]">
                Créer un Abonnement
              </h2>
              <form onSubmit={handleCreateAbonnement} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type d'Abonnement
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    {types.map((type, index) => {
                      const typeId = type.id || (type as any)._id?.toString() || (type as any)._id;
                      return (
                        <option key={typeId || `type-${index}`} value={typeId}>
                          {type.name} - {type.time} jours - {type.price} DA
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedClient.type === 'User' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Utilisateur
                    </label>
                    <select
                      value={selectedClient.id}
                      onChange={(e) => setSelectedClient({ ...selectedClient, id: e.target.value })}
                      className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      required
                    >
                      <option value="">Sélectionner un utilisateur</option>
                      {users.map((user, index) => {
                        const userId = user.id || (user as any)._id?.toString() || (user as any)._id;
                        return (
                          <option key={userId || `user-${index}`} value={userId}>
                            {user.firstName} {user.lastName} - {user.email}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
                {selectedClient.type === 'Workshop' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Atelier
                    </label>
                    <select
                      value={selectedClient.id}
                      onChange={(e) => setSelectedClient({ ...selectedClient, id: e.target.value })}
                      className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      required
                    >
                      <option value="">Sélectionner un atelier</option>
                      {workshops.map((workshop, index) => {
                        const workshopId = workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id;
                        return (
                          <option key={workshopId || `workshop-${index}`} value={workshopId}>
                            {workshop.name} - {workshop.email}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAbonnementModal(false);
                      setSelectedType('');
                      setSelectedClient({ id: '', type: '' });
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
