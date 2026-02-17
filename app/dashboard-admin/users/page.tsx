'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: boolean;
  verfie: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Workshop {
  id: string;
  name: string;
  email: string;
  adr: string;
  phone: string;
  type: string;
  status: boolean;
  verfie: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersAndWorkshops();
  }, []);

  useEffect(() => {
    // Filter users and workshops based on search term
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
      setFilteredWorkshops(workshops);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = users
        .filter(user => {
          const role = user.role?.toLowerCase() || '';
          return role !== 'admin'; // Ensure admin users are filtered out (case insensitive)
        })
        .filter(user => 
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phone.includes(searchTerm)
        );
      setFilteredUsers(filtered);

      const filteredW = workshops.filter(workshop =>
        workshop.name.toLowerCase().includes(searchLower) ||
        workshop.email.toLowerCase().includes(searchLower) ||
        workshop.phone.includes(searchTerm)
      );
      setFilteredWorkshops(filteredW);
    }
  }, [searchTerm, users, workshops]);

  const fetchUsersAndWorkshops = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await response.json();
      if (data.ok) {
        // Map _id to id for users if needed and filter out admin users
        const usersWithId = (data.users || [])
          .map((user: any) => ({
            ...user,
            id: user.id || user._id?.toString() || user._id,
          }))
          .filter((user: any) => {
            const role = user.role?.toLowerCase() || '';
            return role !== 'admin'; // Filter out admin users (case insensitive)
          });
        
        // Map _id to id for workshops if needed
        const workshopsWithId = (data.workshops || []).map((workshop: any) => ({
          ...workshop,
          id: workshop.id || workshop._id?.toString() || workshop._id,
        }));
        
        setUsers(usersWithId);
        setWorkshops(workshopsWithId);
        setFilteredUsers(usersWithId);
        setFilteredWorkshops(workshopsWithId);
      }
    } catch (error) {
      console.error('Error fetching users and workshops:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string | undefined, newStatus: boolean) => {
    try {
      if (!userId) {
        console.error('❌ User ID is missing');
        alert('Erreur: ID utilisateur manquant');
        return;
      }

      console.log('🔄 Updating user status:', { userId, newStatus });
      setUpdatingStatus(userId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      let data;
      try {
        const text = await response.text();
        console.log('📄 Response text:', text);
        data = text ? JSON.parse(text) : {};
      } catch (jsonError) {
        console.error('❌ Error parsing JSON response:', jsonError);
        throw new Error('Erreur lors de la lecture de la réponse du serveur');
      }
      
      console.log('📦 Parsed data:', data);

      if (!response.ok) {
        const errorMessage = data?.message || `Erreur HTTP: ${response.status} ${response.statusText}`;
        console.error('❌ Server error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      if (!data.ok) {
        const errorMessage = data?.message || 'Erreur lors de la mise à jour du statut';
        console.error('❌ API error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      console.log('✅ User status updated successfully');

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
      setFilteredUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (error: any) {
      console.error('❌ Error updating user status:', error);
      const errorMessage = error?.message || 'Erreur lors de la mise à jour du statut';
      alert(errorMessage);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateWorkshopStatus = async (workshopId: string | undefined, newStatus: boolean) => {
    try {
      if (!workshopId) {
        console.error('❌ Workshop ID is missing');
        alert('Erreur: ID atelier manquant');
        return;
      }

      console.log('🔄 Updating workshop status:', { workshopId, newStatus });
      setUpdatingStatus(workshopId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`/api/admin/workshops/${workshopId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Erreur lors de la lecture de la réponse du serveur');
      }
      
      if (!response.ok) {
        const errorMessage = data?.message || `Erreur HTTP: ${response.status} ${response.statusText}`;
        console.error('Server error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      if (!data.ok) {
        const errorMessage = data?.message || 'Erreur lors de la mise à jour du statut';
        console.error('API error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      // Update local state
      setWorkshops(prevWorkshops =>
        prevWorkshops.map(workshop =>
          workshop.id === workshopId ? { ...workshop, status: newStatus } : workshop
        )
      );
      setFilteredWorkshops(prevWorkshops =>
        prevWorkshops.map(workshop =>
          workshop.id === workshopId ? { ...workshop, status: newStatus } : workshop
        )
      );
    } catch (error: any) {
      console.error('Error updating workshop status:', error);
      const errorMessage = error?.message || 'Erreur lors de la mise à jour du statut';
      alert(errorMessage);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-600">
            Gérez tous les utilisateurs et ateliers de la plateforme
          </p>
        </div>

        {/* Search Filter */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, prénom, email ou téléphone..."
                className="w-full pl-12 pr-4 py-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200/50">
            <p className="text-sm text-blue-700 font-medium mb-2">Total Utilisateurs</p>
            <p className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)]">{users.length}</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl shadow-lg p-6 border border-teal-200/50">
            <p className="text-sm text-teal-700 font-medium mb-2">Utilisateurs Actifs</p>
            <p className="text-3xl font-bold text-teal-900 font-[var(--font-poppins)]">
              {users.filter(u => u.status).length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl shadow-lg p-6 border border-purple-200/50">
            <p className="text-sm text-purple-700 font-medium mb-2">Total Ateliers</p>
            <p className="text-3xl font-bold text-purple-900 font-[var(--font-poppins)]">{workshops.length}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl shadow-lg p-6 border border-orange-200/50">
            <p className="text-sm text-orange-700 font-medium mb-2">Ateliers Actifs</p>
            <p className="text-3xl font-bold text-orange-900 font-[var(--font-poppins)]">
              {workshops.filter(w => w.status).length}
            </p>
          </div>
        </div>

        {/* Users Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 px-6 py-4">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)] flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Utilisateurs ({filteredUsers.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Téléphone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Inscription</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const userId = user.id || (user as any)._id?.toString() || (user as any)._id || Math.random().toString();
                      return (
                      <tr key={userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {user.firstName} {user.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{user.phone}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            Client
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-600">{formatDate(user.createdAt)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const userId = user.id || (user as any)._id?.toString() || (user as any)._id;
                              if (!userId) {
                                console.error('User ID is missing:', user);
                                alert('Erreur: Impossible de trouver l\'ID de l\'utilisateur');
                                return;
                              }
                              updateUserStatus(userId, !user.status);
                            }}
                            disabled={updatingStatus === (user.id || (user as any)._id?.toString() || (user as any)._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              user.status
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updatingStatus === (user.id || (user as any)._id?.toString() || (user as any)._id) ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Mise à jour...
                              </span>
                            ) : (
                              user.status ? 'Désactiver' : 'Activer'
                            )}
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workshops Section */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
              <h2 className="text-2xl font-bold text-white font-[var(--font-poppins)] flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Ateliers ({filteredWorkshops.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Téléphone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Adresse</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Inscription</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkshops.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        Aucun atelier trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredWorkshops.map((workshop) => {
                      const workshopId = workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id || Math.random().toString();
                      return (
                      <tr key={workshopId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {workshop.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{workshop.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{workshop.email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">{workshop.phone}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            workshop.type === 'mechanic' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {workshop.type === 'mechanic' ? 'Mécanique' : 'Inspecteur'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-xs truncate">{workshop.adr}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-600">{formatDate(workshop.createdAt)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            workshop.status 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {workshop.status ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const workshopId = workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id;
                              if (!workshopId) {
                                console.error('Workshop ID is missing:', workshop);
                                alert('Erreur: Impossible de trouver l\'ID de l\'atelier');
                                return;
                              }
                              updateWorkshopStatus(workshopId, !workshop.status);
                            }}
                            disabled={updatingStatus === (workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              workshop.status
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updatingStatus === (workshop.id || (workshop as any)._id?.toString() || (workshop as any)._id) ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Mise à jour...
                              </span>
                            ) : (
                              workshop.status ? 'Désactiver' : 'Activer'
                            )}
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
