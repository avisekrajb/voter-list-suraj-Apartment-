import axios from 'axios';

// Use environment variable or fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔗 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to request:', config.url);
    }
    return config;
  },
  error => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => {
    console.log('✅ Response received:', response.config.url, response.status);
    return response;
  },
  error => {
    console.error('❌ Response error:', error.config?.url, error.response?.status, error.message);
    
    if (error.response) {
      if (error.response.status === 401) {
        console.log('🔐 Token expired - logging out');
        localStorage.removeItem('adminToken');
        delete api.defaults.headers.common['Authorization'];
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      console.error('📝 Error response data:', error.response.data);
    } else if (error.request) {
      console.error('🌐 No response received from server');
      console.error('⚠️ Check if backend is running:', API_URL);
    }
    
    return Promise.reject(error);
  }
);

export default api;
