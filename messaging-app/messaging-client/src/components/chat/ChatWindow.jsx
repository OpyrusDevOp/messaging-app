import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, Paperclip, FileIcon, XIcon, MicIcon } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
function ChatWindow({ selectedChat }) {

  const { messages, isUserOnline, sendMessage, fetchMessages, markMessageAsRead, setTyping, typingUsers } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      messages[selectedChat.id]?.forEach(element => {
        markMessageAsRead(selectedChat.id, element.id);
      });
      scrollToBottom();
    }
  }, [selectedChat]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Set message type based on file type
    if (file.type.startsWith('audio/')) {
      setMessage(file.name); // Use filename as default message
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadingFile(true);
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      console.log(response);

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };


  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || uploadingFile) return;

    let mediaUrl = null;
    let messageType = 'text';

    if (selectedFile) {
      const uploadResult = await uploadFile();
      if (uploadResult) {
        mediaUrl = uploadResult.url;
        if (selectedFile.type.startsWith('image/')) {
          messageType = 'image';
        } else if (selectedFile.type.startsWith('audio/')) {
          messageType = 'audio';
        } else {
          messageType = 'file';
        }
      }
      else {
        return;
      }
    }

    sendMessage(selectedChat?.id, message, messageType, mediaUrl);
    setMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      setTyping(selectedChat.id, true);
    }

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      setIsTyping(false);
      setTyping(selectedChat.id, false);
    }, 1000);
  };

  const renderMessage = (message) => {

    switch (message.message_type) {
      case 'audio':
        return (
          <div className="space-y-2">
            <AudioPlayer src={message.media_url} messageId={message.id} />
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      case 'image':
        return (
          <div className="max-w-sm">
            <a href={message.media_url} target="_blank">
              <img
                src={message.media_url}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto cursor-pointer"
              />
            </a>
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2">
            <FileIcon className="w-6 h-6" />
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white-500 hover:underline"
            >
              {message.content || 'Shared file'}
            </a>
          </div>
        );
      default:
        return <p>{message.content}</p>;
    }
  };
  if (!selectedChat) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }

  const otherUser = selectedChat.participants.find(p => p.id !== user.id);
  console.log(otherUser)

  return (
    <div className="flex-grow flex flex-col">
      <div className="bg-white border-b p-4 flex items-center">

        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center mr-3">
          {/* Display first letter of other participant's username */}
          {otherUser.username[0].toUpperCase()}
        </div>
        <div>
          <div className="font-semibold">{otherUser.username}</div>
          <div className="text-xs text-gray-500 flex">
            <div className={`bottom-0 right-2 w-3 h-3 rounded-full border-2 border-white
${isUserOnline(otherUser?.id) ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            {typingUsers[selectedChat.id]?.[otherUser?.id]
              ? 'Typing...'
              : isUserOnline(otherUser?.id)
                ? 'Online'
                : 'Offline'}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 bg-gray-100">
        <div className="space-y-4">
          {messages[selectedChat.id]?.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender_id !== otherUser?.id ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={`p-3 rounded-lg max-w-xs 
                ${message.sender_id !== otherUser?.id
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-white rounded-bl-none'}`}
              >
                {renderMessage(message)}
                <div className={`text-xs mt-1 
                  ${message.sender_id !== otherUser?.id ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {selectedFile && (
        <div className="bg-gray-50 p-2 border-t">
          <div className="flex items-center space-x-2">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-grow">
              <p className="text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="text-gray-500 hover:text-red-500"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <div className="bg-white p-4 flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-500 hover:text-purple-600 transition-colors"
          disabled={uploadingFile}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping(e);
          }}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type Your Message"
          className="flex-grow p-2 border rounded-lg"
        />
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || uploadingFile}
          className={`p-2 rounded-full transition-colors
            ${(!message.trim() && !selectedFile) || uploadingFile
              ? 'bg-purple-300'
              : 'bg-purple-600 hover:bg-purple-700'} text-white`}
        >
          <SendIcon />
        </button>
        <button className="text-gray-500"><MicIcon /></button>
      </div>
    </div>
  );
}

export default ChatWindow;
