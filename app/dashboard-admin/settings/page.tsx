'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/utils/backend';

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string | null;
  status: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'admins'>('profile');
  const [user, setUser] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [updatingAdminStatus, setUpdatingAdminStatus] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Create admin form state
  const [createAdminForm, setCreateAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchAdmins();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.ok && data.user) {
        setUser(data.user);
        setProfileForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.ok && data.admins) {
        setAdmins(data.admins);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();
      if (data.ok) {
        setUser(data.user);
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        // Dispatch event to update header
        window.dispatchEvent(new Event('userUpdated'));
        setSuccessMessage('Profil mis à jour avec succès');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorObj: Record<string, string> = {};
          data.errors.forEach((err: string) => {
            if (err.includes('email')) errorObj.email = err;
            else if (err.includes('téléphone') || err.includes('phone')) errorObj.phone = err;
            else errorObj.general = err;
          });
          setErrors(errorObj);
        } else {
          setErrors({ general: data.message || 'Erreur lors de la mise à jour' });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ general: 'Erreur lors de la mise à jour du profil' });
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/admin/profile/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        setUser(data.user);
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        // Dispatch event to update header
        window.dispatchEvent(new Event('userUpdated'));
        setSuccessMessage('Image de profil mise à jour avec succès');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ image: data.message || 'Erreur lors de l\'upload de l\'image' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors({ image: 'Erreur lors de l\'upload de l\'image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setChangingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setSuccessMessage('Mot de passe modifié avec succès');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorObj: Record<string, string> = {};
          data.errors.forEach((err: string) => {
            if (err.includes('actuel')) errorObj.currentPassword = err;
            else if (err.includes('nouveau')) errorObj.newPassword = err;
            else errorObj.general = err;
          });
          setErrors(errorObj);
        } else {
          setErrors({ general: data.message || 'Erreur lors de la modification du mot de passe' });
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setErrors({ general: 'Erreur lors de la modification du mot de passe' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateAdminStatus = async (adminId: string, newStatus: boolean) => {
    setUpdatingAdminStatus(adminId);
    setErrors({});
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/admins/${adminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la mise à jour du statut');
      }
      
      if (data.ok) {
        setSuccessMessage(data.message || `Statut ${newStatus ? 'activé' : 'désactivé'} avec succès`);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ general: data.message || 'Erreur lors de la mise à jour du statut' });
      }
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      const errorMessage = error.message || 'Erreur lors de la mise à jour du statut';
      setErrors({ general: errorMessage });
      // Show error for 5 seconds
      setTimeout(() => setErrors({}), 5000);
    } finally {
      setUpdatingAdminStatus(null);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    setCreatingAdmin(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(createAdminForm),
      });

      const data = await response.json();
      if (data.ok) {
        setSuccessMessage('Administrateur créé avec succès');
        setCreateAdminForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
        });
        setShowCreateAdminModal(false);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorObj: Record<string, string> = {};
          data.errors.forEach((err: string) => {
            if (err.includes('email')) errorObj.email = err;
            else if (err.includes('téléphone') || err.includes('phone')) errorObj.phone = err;
            else if (err.includes('prénom') || err.includes('firstName')) errorObj.firstName = err;
            else if (err.includes('nom') || err.includes('lastName')) errorObj.lastName = err;
            else if (err.includes('mot de passe') || err.includes('password')) errorObj.password = err;
            else errorObj.general = err;
          });
          setErrors(errorObj);
        } else {
          setErrors({ general: data.message || 'Erreur lors de la création de l\'administrateur' });
        }
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      setErrors({ general: 'Erreur lors de la création de l\'administrateur' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)]">Paramètres</h1>
        <p className="text-gray-600 mt-2">Gérez votre profil et les administrateurs</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
          {errors.general}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Mon Profil
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'admins'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Administrateurs ({admins.length})
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && user && (
        <div className="space-y-6">
          {/* Profile Image Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Photo de Profil</h2>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200 shadow-lg">
                {uploadingImage ? (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                  </div>
                ) : user.profileImage ? (
                  <Image
                    src={getImageUrl(user.profileImage) || ''}
                    alt={`${user.firstName} ${user.lastName}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-50">
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Changer la photo
                      </>
                    )}
                  </span>
                </label>
                {errors.image && (
                  <p className="text-sm text-red-600 mt-2">{errors.image}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">JPG, PNG ou WEBP. Max 5MB</p>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Informations Personnelles</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.email ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.phone ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">Changer le Mot de Passe</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.currentPassword ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                  }`}
                  required
                />
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.newPassword ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">Liste des Administrateurs</h2>
            <button
              onClick={() => setShowCreateAdminModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer un Administrateur
            </button>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
            {admins.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>Aucun autre administrateur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Photo</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Téléphone</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date de création</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-purple-200">
                            {admin.profileImage ? (
                              <Image
                                src={getImageUrl(admin.profileImage) || ''}
                                alt={`${admin.firstName} ${admin.lastName}`}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                {admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{admin.firstName} {admin.lastName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600">{admin.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600">{admin.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleUpdateAdminStatus(admin.id, !admin.status)}
                              disabled={updatingAdminStatus === admin.id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                admin.status ? 'bg-green-500' : 'bg-gray-300'
                              } ${updatingAdminStatus === admin.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  admin.status ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                              {updatingAdminStatus === admin.id && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                                </div>
                              )}
                            </button>
                            <span className={`text-sm font-medium ${admin.status ? 'text-green-600' : 'text-gray-500'}`}>
                              {admin.status ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600">
                            {new Date(admin.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowCreateAdminModal(false)}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border-2 border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 font-[var(--font-poppins)]">Créer un Administrateur</h3>
                <button
                  onClick={() => setShowCreateAdminModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={createAdminForm.firstName}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, firstName: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                        errors.firstName ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                      }`}
                      required
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={createAdminForm.lastName}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, lastName: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                        errors.lastName ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                      }`}
                      required
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={createAdminForm.email}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.email ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={createAdminForm.phone}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, phone: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.phone ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
                  <input
                    type="password"
                    value={createAdminForm.password}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.password ? 'border-red-300' : 'border-gray-300 focus:border-purple-500'
                    }`}
                    required
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Min. 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAdminModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingAdmin ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
