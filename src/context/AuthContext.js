'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ft_token');
    const savedUser = localStorage.getItem('ft_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Set axios default auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const saveSession = (tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem('ft_token', tokenVal);
    localStorage.setItem('ft_user', JSON.stringify(userVal));
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
  };

  const register = async (formData) => {
    const res = await axios.post(`${API_BASE}/auth/register`, formData);
    saveSession(res.data.token, res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    saveSession(res.data.token, res.data.user);
    return res.data;
  };

  const logout = () => {
    clearSession();
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`);
      const updated = { ...user, ...res.data.user };
      setUser(updated);
      localStorage.setItem('ft_user', JSON.stringify(updated));
    } catch (e) {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, register, login, logout, refreshUser, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
