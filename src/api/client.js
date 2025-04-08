import axios from 'axios';
import { auth } from '../config/firebase';
import { getToken } from './auth';

// Use dynamic API URL
const API_URL = import.meta.env.VITE_API_BASE_URL

const responseCache = new Map();
const pendingRequests = new Map();

const CACHE_TTL = 5000; // 5 seconds
const CACHEABLE_METHODS = new Set(['get', 'head']);

// Add cache invalidation for auth-sensitive endpoints
const AUTH_SENSITIVE_ENDPOINTS = new Set(['/cart', '/user', '/orders']);

const client = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Updated interceptor to try Firebase token first, then JWT
client.interceptors.request.use(
  async (config) => {
    // Try Firebase auth first
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
      }
    }
    
    // Fall back to JWT if Firebase fails or not available
    const jwtToken = getToken();
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
    }
    
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
    
    // Invalidate cache for auth-sensitive endpoints when user changes
    if (AUTH_SENSITIVE_ENDPOINTS.has(new URL(config.url, config.baseURL).pathname)) {
      const userToken = config.headers.Authorization;
      cacheKey += `:${userToken}`;
    }

    if (CACHEABLE_METHODS.has(config.method?.toLowerCase())) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        config.adapter = () => Promise.resolve(cached.response);
        return config;
      }
      
      if (pendingRequests.has(cacheKey)) {
        config.adapter = () => pendingRequests.get(cacheKey);
        return config;
      }
      
      pendingRequests.set(cacheKey, 
        client(config)
          .then(response => {
            responseCache.set(cacheKey, {
              response,
              timestamp: Date.now()
            });
            return response;
          })
          .finally(() => {
            pendingRequests.delete(cacheKey);
          })
      );
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhance response interceptor with retry logic
client.interceptors.response.use(
  (response) => {
    const cacheKey = `${response.config.method}:${response.config.url}:${JSON.stringify(response.config.params)}`;
    
    // Cache GET responses
    if (response.config.method?.toLowerCase() === 'get') {
      responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
      
      // Remove from pending after 1 second
      setTimeout(() => pendingRequests.delete(cacheKey), 1000);
    }
    
    return response;
  },
  async (error) => {
    // Handle MongoDB connection errors with retry
    if (error.response?.status === 500 && 
        error.response?.data?.error?.includes('buffering timed out')) {
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get original request config and retry
      const originalRequest = error.config;
      return client(originalRequest);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }

    // Add retry mechanism
    const config = error.config;
    if (!config || !error.response) return Promise.reject(error);
    
    // Retry for timeouts or server errors
    if (error.code === 'ECONNABORTED' || error.response.status >= 500) {
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < 3) {
        config.__retryCount++;
        const delay = Math.pow(2, config.__retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(config);
      }
    }

    if (error.config) {
      const cacheKey = `${error.config.method}:${error.config.url}:${JSON.stringify(error.config.params)}`;
      pendingRequests.delete(cacheKey);
    }
    return Promise.reject(error);
  }
);

// Add request interceptor
client.interceptors.request.use(request => {
  // Check if this is a localhost URL and ensure it's using HTTP, not HTTPS
  if (request.baseURL && request.baseURL.includes('localhost') && request.baseURL.startsWith('https:')) {
    request.baseURL = request.baseURL.replace('https:', 'http:');
  }
  
  return request;
});

export default client; 