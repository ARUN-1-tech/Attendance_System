import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const isLoggingOutRef = useRef(false);

  // Fetch current user details on mount to persist session
  const checkAuth = useCallback(async () => {
    if (isLoggingOutRef.current) return null;
    try {
      const data = await api.get('/api/auth/me/');
      if (!isLoggingOutRef.current) {
        setUser(data);
        return data;
      }
    } catch (err) {
      if (!isLoggingOutRef.current) {
        setUser(null);
      }
    } finally {
      if (!isLoggingOutRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Force light mode theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  const login = async (username, password) => {
    isLoggingOutRef.current = false;
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login/', { username, password });
      const token = data.token || data.session_key;
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      setUser(data.user);
      return data.user;
    } catch (err) {
      localStorage.removeItem('auth_token');
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    isLoggingOutRef.current = true;
    localStorage.removeItem('auth_token');
    setUser(null);
    setLoading(true);
    try {
      await api.post('/api/auth/logout/');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setLoading(false);
      // Keep guard active briefly to ignore any trailing in-flight checkAuth responses
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  };

  const toggleTheme = () => {
    // Light mode only
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, theme, toggleTheme, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
