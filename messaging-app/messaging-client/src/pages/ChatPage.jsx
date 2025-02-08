import React, { useState } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import '../App.css';

function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div className="flex h-screen  bg-gray-100">
      <Sidebar onSelectChat={setSelectedChat} />
      <ChatWindow selectedChat={selectedChat} />
    </div>
  );
}

export default ChatPage;
