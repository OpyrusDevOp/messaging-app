import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const decoded = JSON.parse(atob(token.split('.')[1]));
    setUser(decoded);
    if (token) {
      const newSocket = io(import.meta.env.VITE_SERVER_ADDRESS, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('new_message', handleNewMessage);

      newSocket.on('user_typing', ({ conversationId, userId, isTyping }) => {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            [userId]: isTyping
          }
        }));
      });

      newSocket.on('message_read', ({ conversationId, messageId, userId }) => {
        setMessages(prev => ({
          ...prev,
          [conversationId]: prev[conversationId].map(msg =>
            msg.id === messageId
              ? { ...msg, readBy: [...(msg.readBy || []), userId] }
              : msg
          )
        }));
      });

      newSocket.on('users_online', (users) => {
        setOnlineUsers(new Set(users));
      });

      newSocket.on('user_connected', (userId) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      newSocket.on('user_disconnected', (userId) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      setSocket(newSocket);
      fetchConversations();

      return () => newSocket.close();
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setConversations(data);
      //setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      //setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    console.log(conversationId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMessages(prev => ({
        ...prev,
        [conversationId]: data
      }));
      sortMessages(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleNewMessage = (message) => {
    console.log(message);
    if (currentConversation) {
      messages[currentConversation.id].forEach(element => {
        markMessageAsRead(currentConversation.id, element.id);
      });
    }
    // Update messages
    setMessages(prev => ({
      ...prev,
      [message.conversationId]: [
        ...(prev[message.conversationId] || []),
        message
      ]
    }));
    console.log(user);

    // Update conversation list
    setConversations(prev => {
      const updatedConversations = prev.map(conv => {
        if (conv.id === message.conversationId) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount: message.senderId !== user?.id ? conv.unreadCount + 1 : conv.unreadCount
          };
        }
        return conv;
      });

      // Sort conversations by last message time
      return updatedConversations;
    });
  };

  const sendMessage = (conversationId, content, messageType = 'text', mediaUrl = null) => {
    if (socket) {
      socket.emit('send_message', {
        conversationId,
        content,
        messageType,
        mediaUrl
      });
    }
  };

  const markMessageAsRead = (conversationId, messageId) => {
    if (socket) {
      socket.emit('mark_read', { conversationId, messageId });
    }
  };

  const setTyping = (conversationId, isTyping) => {
    if (socket) {
      socket.emit('typing', { conversationId, isTyping });
    }
  };

  const searchUsers = async (query) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/users/search?query=${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });


    const result = await response.json();
    console.log(response);
    return result;
  };

  const startNewConversation = async (userId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ participantId: userId })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();

      // Fetch the new conversation details
      const conversationResponse = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/conversations/${data.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!conversationResponse.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const conversationData = await conversationResponse.json();

      // Add new conversation to state
      setConversations(prev => [conversationData, ...prev]);

      return conversationData;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  };

  const sortMessages = (conversationId) => {
    setMessages((prevMessages) => {
      if (!prevMessages[conversationId]) return prevMessages; // If no messages, return as is

      // Sort the messages array in-place
      prevMessages[conversationId].sort(
        (a, b) => new Date(
          a.created_at) - new Date(b.created_at) // Ascending order
      );

      console.log(prevMessages[conversationId]);

      return { ...prevMessages }; // Trigger state update
    });
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      currentConversation,
      setCurrentConversation,
      startNewConversation,
      messages,
      sendMessage,
      markMessageAsRead,
      setTyping,
      typingUsers,
      onlineUsers,
      isUserOnline,
      searchUsers,
      fetchConversations,
      fetchMessages,
      handleNewMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
