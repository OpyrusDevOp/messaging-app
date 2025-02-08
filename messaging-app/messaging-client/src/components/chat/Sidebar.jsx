import React from 'react';
import { MessageCircleMore, LogOutIcon, SettingsIcon } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

function Sidebar({ onSelectChat }) {
  const { searchUsers, conversations, startNewConversation } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { signout } = useAuth();
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 3) {
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }

  };
  const handleStartConversation = async (user) => {
    try {
      const conversation = await startNewConversation(user.id);
      onSelectChat(conversation);
      setSearchQuery(''); // Clear search
      setSearchResults([]); // Clear results
    } catch (err) {
      setError('Failed to start conversation');
    }
  };
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-purple-600">Chats</h2>
        <button className="text-purple-600 " onClick={() => { }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="px-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search For Contacts or Messages"
          className="w-full p-2 border rounded-lg text-sm"
        />
      </div>

      {/** <div className="px-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Recent Chats</h3>
        <div className="flex space-x-2 mb-4">
          {contacts.map(contact => (
            <img
              key={contact.id}
              src={contact.avatar}
              alt={contact.name}
              className="w-10 h-10 rounded-full"
            />
          ))}
        </div>
      </div> **/}

      <div className="flex-grow overflow-y-auto">
        {searchQuery ? (
          searchResults.map(user => (
            <div
              key={user.id}
              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleStartConversation(user)}>
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center mr-3">
                {user.username[0].toUpperCase()}
              </div>
              <span className="font-semibold">{user.username}</span>
            </div>
          ))
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => onSelectChat(conversation)}
            >
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center mr-3">
                {/* Display first letter of other participant's username */}
                {conversation.participants[0].username[0].toUpperCase()}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between">
                  <span className="font-semibold">{conversation.participants[0].username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(conversation.lastMessage?.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">
                    {conversation.lastMessage?.content}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-purple-600 text-white text-xs rounded-full px-2">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4 flex justify-between">
        <button className="text-purple-600"><MessageCircleMore /></button>
        <button className="text-gray-500 hover:text-red-300" onClick={signout}><LogOutIcon /></button>
      </div>
    </div>
  );
}

export default Sidebar;
