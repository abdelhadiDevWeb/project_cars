'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@/contexts/UserContext';

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

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
}

export default function ChatModal({ isOpen, onClose, otherUserId, otherUserName, otherUserEmail }: ChatModalProps) {
  const { user, token } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isOpen || !user || !token) return;

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
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isOpen, user, token]);

  // Get or create chat and load messages
  useEffect(() => {
    if (!isOpen || !user || !token || !otherUserId) return;

    // Check if user is trying to chat with themselves
    if (user._id === otherUserId) {
      console.warn('Cannot create chat with yourself');
      // Close modal if user tries to chat with themselves
      onClose();
      return;
    }

    const getOrCreateChat = async () => {
      // Don't show loading - just load messages silently
      try {
        const response = await fetch('/api/chat/get-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ otherUserId }),
        });

        const data = await response.json();
        if (data.ok) {
          setChatId(data.chat.id);
          // Remove duplicates from messages
          const uniqueMessages = (data.messages || []).filter((msg: Message, index: number, self: Message[]) => 
            index === self.findIndex((m: Message) => m.id === msg.id)
          );
          setMessages(uniqueMessages);
          scrollToBottom();
        } else {
          // Only log error if it's not a known error we handle
          if (data.message && !data.message.includes('Erreur serveur')) {
            console.error('Error getting chat:', data.message);
          }
          // If error is about chatting with yourself, close modal
          if (data.message && (data.message.includes('vous-même') || data.message.includes('yourself'))) {
            onClose();
            return;
          }
          // For server errors, try to close modal gracefully
          if (data.message && data.message.includes('Erreur serveur')) {
            console.warn('Server error while getting chat, closing modal');
            onClose();
            return;
          }
        }
      } catch (error) {
        console.error('Error getting chat:', error);
      }
    };

    getOrCreateChat();
  }, [isOpen, user, token, otherUserId, onClose]);

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
    if (!newMessage.trim() || !chatId || !token || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_Chat: chatId,
          message: newMessage.trim(),
          id_reciver: otherUserId,
        }),
      });

        const data = await response.json();
        if (data.ok) {
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.id === data.message.id);
            if (exists) return prev;
            return [...prev, data.message];
          });
          setNewMessage('');
          scrollToBottom();
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

  if (!isOpen) return null;

  const isMyMessage = (message: Message) => {
    return message.id_sender.id === user?._id;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center text-white font-bold">
              {otherUserName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{otherUserName}</h3>
              <p className="text-white/80 text-xs">{otherUserEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/25 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Aucun message. Commencez la conversation !</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMine = isMyMessage(message);
              // Use combination of id and index to ensure unique keys
              const uniqueKey = `${message.id}-${index}-${message.createdAt}`;
              return (
                <div
                  key={uniqueKey}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
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

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              disabled={sending || !chatId}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !chatId}
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
          </div>
        </form>
      </div>
    </div>
  );
}
