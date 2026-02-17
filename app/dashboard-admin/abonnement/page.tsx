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
              + Ajouter Abonnement
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
            >
              + Ajouter Plusieurs Abonnements
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
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Aucun type d'abonnement</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {types.map((type, index) => {
                    const typeId = type.id || (type as any)._id?.toString() || (type as any)._id;
                    const colors = [
                      { gradient: 'from-teal-500 via-cyan-500 to-blue-500', icon: 'from-teal-100 to-cyan-100', text: 'from-teal-600 to-cyan-600' },
                      { gradient: 'from-blue-500 via-indigo-500 to-purple-500', icon: 'from-blue-100 to-indigo-100', text: 'from-blue-600 to-indigo-600' },
                      { gradient: 'from-purple-500 via-pink-500 to-rose-500', icon: 'from-purple-100 to-pink-100', text: 'from-purple-600 to-pink-600' },
                      { gradient: 'from-orange-500 via-red-500 to-pink-500', icon: 'from-orange-100 to-red-100', text: 'from-orange-600 to-red-600' },
                      { gradient: 'from-green-500 via-emerald-500 to-teal-500', icon: 'from-green-100 to-emerald-100', text: 'from-green-600 to-emerald-600' },
                      { gradient: 'from-yellow-500 via-amber-500 to-orange-500', icon: 'from-yellow-100 to-amber-100', text: 'from-yellow-600 to-amber-600' },
                    ];
                    const colorScheme = colors[index % colors.length];
                    return (
                      <div
                        key={typeId || `type-${index}`}
                        className="group relative bg-white rounded-3xl border-2 border-gray-200 hover:border-teal-400 transition-all duration-500 shadow-xl hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 hover:scale-[1.02]"
                      >
                        {/* Animated Background Pattern */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-200/20 to-transparent rounded-full blur-2xl"></div>
                        </div>
                        
                        {/* Gradient Header */}
                        <div className={`bg-gradient-to-br ${colorScheme.gradient} p-6 text-white relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                              <div className={`w-14 h-14 bg-gradient-to-br ${colorScheme.icon} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="px-4 py-2 bg-white/30 backdrop-blur-md rounded-full text-sm font-bold shadow-lg">
                                #{index + 1}
                              </span>
                            </div>
                            <h3 className="text-3xl font-bold font-[var(--font-poppins)] mb-2 drop-shadow-lg">{type.name}</h3>
                            <p className="text-sm text-white/90">Type d'abonnement</p>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-5 space-y-3 relative z-10">
                          {/* Durée Section */}
                          <div className="p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-teal-300 transition-all group-hover:shadow-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br ${colorScheme.icon} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Durée</p>
                                  <p className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">{type.time} jours</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Prix Section */}
                          <div className={`p-4 bg-gradient-to-br ${colorScheme.icon} rounded-xl border-2 border-amber-300 hover:border-amber-400 transition-all group-hover:shadow-md`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                  <svg className={`w-5 h-5 bg-gradient-to-r ${colorScheme.text} bg-clip-text text-transparent`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-0.5">Prix</p>
                                  <p className={`text-2xl font-bold bg-gradient-to-r ${colorScheme.text} bg-clip-text text-transparent font-[var(--font-poppins)]`}>
                                    {type.price.toLocaleString('fr-FR')} DA
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {users.map((user, index) => {
                    const userId = user.id || (user as any)._id?.toString() || (user as any)._id;
                    return (
                      <div
                        key={userId || `user-${index}`}
                        className="group bg-gradient-to-br from-white via-blue-50/50 to-white p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02]"
                        onClick={() => {
                          if (userId) {
                            setSelectedClient({ id: userId, type: 'User' });
                            setShowCreateAbonnementModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg font-[var(--font-poppins)]">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <p className="text-sm text-gray-700 font-medium">{user.phone}</p>
                        </div>
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
          <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-3xl shadow-2xl border-2 border-green-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-8 py-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/25 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white font-[var(--font-poppins)] drop-shadow-lg">
                      Abonnements Actifs
                    </h2>
                    <p className="text-white/90 text-sm mt-1">Total: {abonnements.length} abonnement(s)</p>
                  </div>
                </div>
                <div className="px-6 py-3 bg-white/25 backdrop-blur-md rounded-2xl border-2 border-white/30 shadow-xl">
                  <p className="text-2xl font-bold text-white font-[var(--font-poppins)]">{abonnements.length}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              {abonnements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Aucun abonnement actif</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {abonnements.map((abonnement, index) => {
                    const abonnementId = abonnement.id || `abonnement-${index}`;
                    const isExpired = new Date(abonnement.date_end) < new Date();
                    const isActive = new Date(abonnement.date_start) <= new Date() && !isExpired;
                    const isClient = abonnement.clientInfo?.type === 'User';
                    
                    return (
                      <div
                        key={abonnementId}
                        className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-teal-400 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden transform hover:-translate-y-1"
                      >
                        {/* Header with gradient */}
                        <div className={`p-4 text-white relative overflow-hidden ${
                          isClient 
                            ? 'bg-gradient-to-br from-blue-500 via-teal-500 to-cyan-500' 
                            : 'bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500'
                        }`}>
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-white/25 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                {isClient ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold font-[var(--font-poppins)] drop-shadow-lg truncate">
                                  {abonnement.clientInfo?.name || 'N/A'}
                                </p>
                                <p className="text-xs text-white/90 truncate mt-0.5">{abonnement.clientInfo?.email || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                                isExpired
                                  ? 'bg-red-500/40 text-white border border-red-300/50'
                                  : isActive
                                  ? 'bg-green-500/40 text-white border border-green-300/50'
                                  : 'bg-yellow-500/40 text-white border border-yellow-300/50'
                              }`}>
                                {isExpired ? 'Expiré' : isActive ? 'Actif' : 'À venir'}
                              </span>
                              {abonnement.clientInfo && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-1 bg-white/25 backdrop-blur-md rounded-full text-xs font-semibold">
                                    {isClient ? 'Client' : 'Atelier'}
                                  </span>
                                  {abonnement.clientInfo.workshopType && (
                                    <span className="px-2 py-1 bg-white/25 backdrop-blur-md rounded-full text-xs font-semibold">
                                      {abonnement.clientInfo.workshopType === 'mechanic' ? 'Mécanique' : 'Atelier Voiture'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 space-y-3 relative z-10">
                          {/* Type d'abonnement */}
                          {abonnement.type_abonnement && (
                            <div className="p-3 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-xl border border-teal-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Type d'Abonnement</p>
                                  <p className="text-sm font-bold text-gray-900 font-[var(--font-poppins)] truncate">{abonnement.type_abonnement.name}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{abonnement.type_abonnement.time} jours</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-gray-500 font-semibold uppercase">Début</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 font-[var(--font-poppins)]">
                                {new Date(abonnement.date_start).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            
                            <div className="p-3 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-xl border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-gray-500 font-semibold uppercase">Fin</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 font-[var(--font-poppins)]">
                                {new Date(abonnement.date_end).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          
                          {/* Prix */}
                          <div className="p-3 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-xl border-2 border-amber-300">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Prix Total</p>
                                <p className="text-lg font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent font-[var(--font-poppins)] truncate">
                                  {abonnement.price.toLocaleString('fr-FR')} DA
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {workshops.map((workshop, index) => {
                    const workshopId = workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id;
                    return (
                      <div
                        key={workshopId || `workshop-${index}`}
                        className="group bg-gradient-to-br from-white via-purple-50/50 to-white p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02]"
                        onClick={() => {
                          if (workshopId) {
                            setSelectedClient({ id: workshopId, type: 'Workshop' });
                            setShowCreateAbonnementModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {workshop.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg font-[var(--font-poppins)]">{workshop.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{workshop.email}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <p className="text-sm text-gray-700 font-medium">{workshop.phone}</p>
                          </div>
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md ${
                            workshop.type === 'mechanic' 
                              ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-2 border-orange-200' 
                              : 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 border-2 border-teal-200'
                          }`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            {workshop.type === 'mechanic' ? 'Mécanique' : 'Atelier Voiture'}
                          </span>
                        </div>
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
                Ajouter Abonnement
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
                Ajouter Plusieurs Abonnements
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
