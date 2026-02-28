'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { io, Socket } from 'socket.io-client';

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

interface Message {
  id: string;
  id_Chat: string;
  message: string;
  id_sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  id_reciver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { user, token, isAuthenticated } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user || !token) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    const newSocket = io(backendUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      // Join user room
      newSocket.emit('join_user', user._id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for new messages
    newSocket.on('new_message', (message: Message) => {
      // If this message is for the currently selected chat, add it
      if (selectedChat && message.id_Chat === selectedChat.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
      
      // Update the chat list to show the new message
      setChats(prev => prev.map(chat => {
        if (chat.id === message.id_Chat) {
          return {
            ...chat,
            lastMessage: {
              id: message.id,
              message: message.message,
              id_sender: message.id_sender,
              createdAt: message.createdAt
            },
            unreadCount: message.id_reciver.id === user._id ? chat.unreadCount + 1 : chat.unreadCount,
            updatedAt: message.createdAt
          };
        }
        return chat;
      }));
    });

    // Listen for new notifications
    newSocket.on('new_notification', (notification: any) => {
      console.log('New notification received:', notification);
      // You can add a toast notification here if needed
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, token, selectedChat]);

  // Fetch all chats
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/chat/my-chats', {
          headers: {
            'Authorization': `Bearer ${token}`,
    },
        });

        const data = await response.json();
        if (data.ok) {
          // Sort chats by updatedAt (most recent first)
          const sortedChats = data.chats.sort((a: Chat, b: Chat) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          setChats(sortedChats);
        } else {
          console.error('Error fetching chats:', data.message);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isAuthenticated, token]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!selectedChat || !token) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/chat/${selectedChat.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.ok) {
          setMessages(data.messages || []);
          scrollToBottom();
          
          // Mark messages as read
          await fetch(`/api/chat/${selectedChat.id}/mark-read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          // Update unread count in chat list
          setChats(prev => prev.map(chat => 
            chat.id === selectedChat.id ? { ...chat, unreadCount: 0 } : chat
          ));
        } else {
          console.error('Error fetching messages:', data.message);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedChat, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !token || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_Chat: selectedChat.id,
          message: newMessage.trim(),
          id_reciver: selectedChat.otherUser.id,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        scrollToBottom();
        
        // Update chat list with new last message
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id 
            ? {
                ...chat,
                lastMessage: {
                  id: data.message.id,
                  message: data.message.message,
                  id_sender: data.message.id_sender,
                  createdAt: data.message.createdAt
                },
                updatedAt: data.message.createdAt
              }
            : chat
        ));
      } else {
        console.error('Error sending message:', data.message);
        alert(data.message || 'Erreur lors de l\'envoi du message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  const isMyMessage = (message: Message) => {
    return message.id_sender.id === user?._id;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const filteredChats = chats.filter(chat => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${chat.otherUser.firstName} ${chat.otherUser.lastName}`.toLowerCase();
    return fullName.includes(searchLower) || chat.otherUser.email.toLowerCase().includes(searchLower);
  });

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vous devez être connecté pour voir vos messages</p>
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    );
    }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-[var(--font-poppins)] mb-2">Messages</h1>
        <p className="text-gray-600">Communiquez avec les acheteurs intéressés</p>
      </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
            </div>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500">Aucune conversation</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">
                        {chat.otherUser.firstName[0]}{chat.otherUser.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {chat.otherUser.firstName} {chat.otherUser.lastName}
                          </h3>
                          {chat.unreadCount > 0 && (
                            <span className="bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <>
                            <p className="text-sm text-gray-600 truncate mb-1">
                              {chat.lastMessage.message}
                            </p>
                            <p className="text-xs text-gray-400">{formatTime(chat.lastMessage.createdAt)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
            {selectedChat ? (
                <>
                  {/* Messages Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      {selectedChat.otherUser.firstName[0]}{selectedChat.otherUser.lastName[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                        {selectedChat.otherUser.firstName} {selectedChat.otherUser.lastName}
                        </h3>
                      <p className="text-sm text-gray-600">{selectedChat.otherUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages List */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                >
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Aucun message. Commencez la conversation !</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine = isMyMessage(message);
                      return (
                      <div
                          key={message.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              isMine
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none border border-gray-200 shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                              isMine ? 'text-white/70' : 'text-gray-500'
                          }`}>
                              {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                          </p>
                        </div>
                      </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Tapez votre message..."
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      disabled={sending}
                      />
                      <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        Envoyer
                        </>
                      )}
                      </button>
                  </form>
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
