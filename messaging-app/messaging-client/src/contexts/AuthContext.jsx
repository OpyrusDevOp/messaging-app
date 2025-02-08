import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Decode token and set user
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser(decoded);
    }
    setLoading(false);
  }, []);

  const signin = async (username, password) => {
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      const decoded = JSON.parse(atob(data.token.split('.')[1]));
      setUser(decoded);
    }
    return data;
  };

  const signup = async (username, password) => {
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      const decoded = JSON.parse(atob(data.token.split('.')[1]));
      setUser(decoded);
    }
    return data;
  };

  const signout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signin, signup, signout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
