// components/Chat/Message.jsx
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Message = ({ message, onRead }) => {
  const { user } = useAuth();
  const isOwn = message.senderId === user.id;

  useEffect(() => {
    if (!isOwn && !message.readBy?.includes(user.id)) {
      onRead();
    }
  }, []);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`p-3 rounded-lg max-w-[70%] ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}>
        {message.messageType === 'text' ? (
          <p>{message.content}</p>
        ) : message.messageType === 'image' ? (
          <img src={message.mediaUrl} alt="Shared image" className="max-w-full rounded" />
        ) : (
          <video src={message.mediaUrl} controls className="max-w-full rounded" />
        )}
      </div>
    </div>
  );
};
