'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { getImageUrl, getBackendUrl } from '@/utils/backend';
import { io, Socket } from 'socket.io-client';
import ChatModal from '@/components/ChatModal';

interface Chat {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  lastMessage: {
    id: string;
    message: string;
    id_sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [search, setSearch] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  // Fetch chats
  const fetchChats = async () => {
    if (!token) return;

    try {
      const isInitialLoad = !hasLoadedOnceRef.current;
      if (isInitialLoad) setLoading(true);
      const res = await fetch('/api/chat/my-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok && data.chats) {
        console.log('Received chats:', data.chats);
        // Filter out any invalid chats and ensure user is not chatting with themselves
        const validChats = data.chats.filter((chat: Chat) => 
          chat && 
          chat.otherUser && 
          chat.otherUser.id && 
          user && 
          user._id !== chat.otherUser.id
        );
        setChats(validChats);
        // Calculate total unread count
        const total = validChats.reduce((sum: number, chat: Chat) => sum + (chat.unreadCount || 0), 0);
        setTotalUnread(total);
      } else {
        console.error('Error fetching chats:', data.message);
        setChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchChats();
    }
  }, [token, user]);

  // Handle query parameter to open specific chat
  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam && chats.length > 0 && user && !showChatModal) {
      // Find chat with this user
      const targetChat = chats.find(chat => 
        chat.otherUser.id === userIdParam && user._id !== chat.otherUser.id
      );
      
      // Only open if we have a target chat and modal is not already open
      if (targetChat) {
        // Set both states at once to avoid flickering
        setSelectedChat(targetChat);
        setShowChatModal(true);
        // Remove query param from URL after modal is set to open
        setTimeout(() => {
          router.replace('/chats', { scroll: false });
        }, 300);
      }
    }
  }, [chats, searchParams, user, router, showChatModal]);

  // Socket.IO setup
  useEffect(() => {
    if (!user || !token) return;

    const backendUrl = getBackendUrl();
    const newSocket = io(backendUrl, {
      auth: {
        token: token,
      },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for chats page');
      newSocket.emit('join_user', user._id);
    });

    // Listen for new messages
    newSocket.on('new_message', (message: any) => {
      // Refresh chats to update last message and unread count
      // Delay to avoid flickering when modal is open
      setTimeout(() => {
        fetchChats();
      }, 500);
    });

    // Listen for notifications
    newSocket.on('new_notification', (notification: any) => {
      if (notification.type === 'message') {
        // Refresh chats when a message notification arrives
        fetchChats();
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_user', user._id);
        newSocket.disconnect();
      }
    };
  }, [user, token]);

  const handleChatClick = async (chat: Chat) => {
    // Check if user is trying to chat with themselves
    if (user && user._id === chat.otherUser.id) {
      // Silently ignore - this shouldn't happen but filter it out
      return;
    }
    // If clicking the same chat that's already open, do nothing
    if (selectedChat && selectedChat.id === chat.id && showChatModal) {
      return;
    }

    // Set both states synchronously first to open modal immediately
    setSelectedChat(chat);
    setShowChatModal(true);

    // Mark all message notifications for this chat as read (after modal is opening)
    if (token && chat.otherUser.id) {
      try {
        await fetch(`/api/notification/read-chat-messages/${chat.otherUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error marking chat notifications as read:', error);
      }
    }

    // Refresh chats after opening to update unread count (single refresh after delay)
    setTimeout(() => {
      fetchChats();
    }, 800);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredChats = chats
    .filter((chat) => user && user._id !== chat.otherUser.id)
    .filter((chat) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const fullName = `${chat.otherUser.firstName} ${chat.otherUser.lastName}`.toLowerCase();
      const email = (chat.otherUser.email || '').toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-teal-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Chargement des chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30">
      {/* Floating Back Button */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:shadow-xl text-gray-700 hover:text-teal-600 transition-all duration-200 hover:scale-105 group"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-semibold text-sm">Retour</span>
      </Link>

      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-16 max-w-5xl">
        {/* Title Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent font-[var(--font-poppins)]">
                Mes Chats
              </h1>
              {totalUnread > 0 && (
                <span className="inline-flex items-center justify-center min-w-8 h-8 px-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg animate-pulse">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* Modern Search Bar */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200/60 bg-white/80 backdrop-blur-sm shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
            />
            {search.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                aria-label="Effacer la recherche"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {chats.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-12 lg:p-16 text-center border border-white/20 animate-fade-in-up">
            <div className="w-28 h-28 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-14 h-14 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Aucun chat</h2>
            <p className="text-gray-600 text-lg mb-8">Vous n'avez pas encore de conversations. Commencez à discuter avec un vendeur !</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-2xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Parcourir les véhicules
            </Link>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-fade-in-up">
            {filteredChats.length === 0 ? (
              <div className="p-12 lg:p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucun résultat</h2>
                <p className="text-gray-600">Essayez un autre nom ou email.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100/50">
                {filteredChats.map((chat, index) => {
                  const isSelected = selectedChat?.id === chat.id && showChatModal;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleChatClick(chat)}
                      className={`w-full p-5 lg:p-6 transition-all duration-200 text-left flex items-center gap-4 hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50 group ${
                        isSelected ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500' : ''
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {chat.otherUser.profileImage ? (
                          <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden ring-2 ring-white shadow-lg group-hover:ring-teal-300 transition-all duration-200 group-hover:scale-105">
                            <Image
                              src={getImageUrl(chat.otherUser.profileImage)}
                              alt={`${chat.otherUser.firstName} ${chat.otherUser.lastName}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                            {chat.otherUser.firstName[0]}{chat.otherUser.lastName[0]}
                          </div>
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-7 h-7 px-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg animate-pulse">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                              {chat.otherUser.firstName} {chat.otherUser.lastName}
                            </h3>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{chat.otherUser.email}</p>
                          </div>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-400 flex-shrink-0 font-medium">
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1">
                          {chat.lastMessage ? (
                            <p className={`text-sm truncate leading-relaxed ${
                              chat.unreadCount > 0 
                                ? 'font-semibold text-gray-900' 
                                : 'text-gray-600'
                            }`}>
                              <span className={chat.lastMessage.id_sender.id === user?._id ? 'text-teal-600 font-medium' : ''}>
                                {chat.lastMessage.id_sender.id === user?._id ? 'Vous: ' : ''}
                              </span>
                              {chat.lastMessage.message}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Aucun message</p>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-gray-300 group-hover:text-teal-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {showChatModal && selectedChat && user && user._id !== selectedChat.otherUser.id && (
        <ChatModal
          key={`chat-${selectedChat.id}`}
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            // Delay clearing selectedChat to allow modal close animation
            setTimeout(() => {
              setSelectedChat(null);
            }, 300);
            // Refresh chats after closing modal
            setTimeout(() => {
              fetchChats();
            }, 400);
          }}
          otherUserId={selectedChat.otherUser.id}
          otherUserName={`${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName}`}
          otherUserEmail={selectedChat.otherUser.email}
        />
      )}
    </div>
  );
}
