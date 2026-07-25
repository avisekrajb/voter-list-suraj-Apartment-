import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor - Add token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token added to request:', config.url); // Debug log
    } else {
      console.log('No token found for request:', config.url); // Debug log
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  response => {
    console.log('Response received:', response.config.url, response.status); // Debug log
    return response;
  },
  error => {
    console.error('Response error:', error.config?.url, error.response?.status, error.message);
    
    if (error.response) {
      // Token expired or invalid
      if (error.response.status === 401) {
        console.log('Token expired or invalid - logging out');
        localStorage.removeItem('adminToken');
        delete api.defaults.headers.common['Authorization'];
        // Don't redirect here, let the component handle it
      }
      
      // Log the error response
      console.error('Error response data:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;