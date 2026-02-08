'use client';

import { useState } from "react";

export default function OrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const orders = [
    { 
      id: '#ORD-001', 
      car: 'Golf 2020', 
      client: 'Ahmed B.', 
      phone: '+213 555 123 456',
      date: '2024-01-15',
      time: 'Il y a 2 heures', 
      status: 'En attente', 
      priority: 'high',
      location: 'Alger',
      description: 'Vérification complète du véhicule avant achat'
    },
    { 
      id: '#ORD-002', 
      car: 'Tucson 2018', 
      client: 'Fatima Z.', 
      phone: '+213 555 789 012',
      date: '2024-01-15',
      time: 'Il y a 5 heures', 
      status: 'En cours', 
      priority: 'medium',
      location: 'Oran',
      description: 'Inspection mécanique et carrosserie'
    },
    { 
      id: '#ORD-003', 
      car: 'Clio 2018', 
      client: 'Mohamed A.', 
      phone: '+213 555 345 678',
      date: '2024-01-14',
      time: 'Hier', 
      status: 'Terminée', 
      priority: 'low',
      location: 'Constantine',
      description: 'Vérification terminée avec succès'
    },
    { 
      id: '#ORD-004', 
      car: 'BMW Series 3 2019', 
      client: 'Sara K.', 
      phone: '+213 555 901 234',
      date: '2024-01-14',
      time: 'Il y a 1 jour', 
      status: 'En attente', 
      priority: 'high',
      location: 'Alger',
      description: 'Vérification complète demandée'
    },
  ];

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const statusCounts = {
    all: orders.length,
    'En attente': orders.filter(o => o.status === 'En attente').length,
    'En cours': orders.filter(o => o.status === 'En cours').length,
    'Terminée': orders.filter(o => o.status === 'Terminée').length,
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Commandes de vérification</h1>
        <p className="text-gray-600">Gérez les demandes de vérification de véhicules</p>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(['all', 'En attente', 'En cours', 'Terminée'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'all' ? 'Toutes' : status} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 font-[var(--font-poppins)]">{order.id}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'En attente' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {order.status}
                  </span>
                  {order.priority === 'high' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Priorité haute
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-1">{order.car}</p>
                <p className="text-sm text-gray-600">{order.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="text-sm font-medium text-gray-900">{order.client}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <a href={`tel:${order.phone}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    {order.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">Localisation</p>
                  <p className="text-sm font-medium text-gray-900">{order.location}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {order.time}
              </div>
              <div className="flex gap-2">
                {order.status === 'En attente' && (
                  <>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      Accepter
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                      Refuser
                    </button>
                  </>
                )}
                {order.status === 'En cours' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                    Marquer comme terminée
                  </button>
                )}
                {order.status === 'Terminée' && (
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                    Voir le rapport
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-lg">Aucune commande {selectedStatus !== 'all' ? `avec le statut "${selectedStatus}"` : ''}</p>
        </div>
      )}
    </div>
  );
}
