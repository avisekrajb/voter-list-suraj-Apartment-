import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAdmin(true);
      console.log('Auth restored from localStorage');
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login...');
      const response = await api.post('/admin/login', { email, password });
      const { token } = response.data;
      
      localStorage.setItem('adminToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAdmin(true);
      
      console.log('Login successful');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('adminToken');
    delete api.defaults.headers.common['Authorization'];
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};