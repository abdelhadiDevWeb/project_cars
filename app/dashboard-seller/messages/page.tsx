'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  // Mock data - will be replaced with API data
  const conversations = [
    {
      id: 1,
      buyer: 'Ahmed Benali',
      car: 'Golf 2020',
      lastMessage: 'Bonjour, est-ce que la voiture est toujours disponible?',
      time: 'Il y a 2 heures',
      unread: 2,
      avatar: 'AB',
    },
    {
      id: 2,
      buyer: 'Fatima Zohra',
      car: 'Tucson 2018',
      lastMessage: 'Merci pour les informations supplémentaires',
      time: 'Hier',
      unread: 0,
      avatar: 'FZ',
    },
    {
      id: 3,
      buyer: 'Mohamed Amine',
      car: 'Clio 2018',
      lastMessage: 'Je suis intéressé par votre véhicule',
      time: 'Il y a 3 jours',
      unread: 1,
      avatar: 'MA',
    },
  ];

  const messages = selectedConversation ? [
    { id: 1, sender: 'buyer', text: 'Bonjour, est-ce que la voiture est toujours disponible?', time: '14:30' },
    { id: 2, sender: 'seller', text: 'Bonjour! Oui, elle est toujours disponible. Voulez-vous prendre rendez-vous pour la voir?', time: '14:35' },
    { id: 3, sender: 'buyer', text: 'Parfait! Quand seriez-vous disponible?', time: '14:40' },
    { id: 4, sender: 'seller', text: 'Je suis disponible demain après-midi ou ce weekend.', time: '14:42' },
  ] : [];

  useEffect(() => {
    const buyer = searchParams?.get('buyer');
    if (buyer) {
      const conv = conversations.find(c => c.buyer.includes(buyer));
      if (conv) setSelectedConversation(conv.id);
    }
  }, [searchParams]);

  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: API call to send message
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Messages</h1>
        <p className="text-gray-600">Communiquez avec les acheteurs intéressés</p>
      </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="divide-y divide-gray-200">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conversation.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{conversation.buyer}</h3>
                          {conversation.unread > 0 && (
                            <span className="bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {conversation.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-1">{conversation.car}</p>
                        <p className="text-xs text-gray-500 truncate">{conversation.lastMessage}</p>
                        <p className="text-xs text-gray-400 mt-1">{conversation.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Messages Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                        {conversations.find(c => c.id === selectedConversation)?.avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {conversations.find(c => c.id === selectedConversation)?.buyer}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {conversations.find(c => c.id === selectedConversation)?.car}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          msg.sender === 'seller'
                            ? 'bg-teal-500 text-white rounded-br-none'
                            : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender === 'seller' ? 'text-teal-100' : 'text-gray-500'
                          }`}>
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Sélectionnez une conversation pour commencer</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
