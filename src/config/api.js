// Ensure API URL is always http:// for localhost and includes /api
const API_URL = 
  (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.includes('localhost'))
    ? import.meta.env.VITE_API_BASE_URL.replace('https:', 'http:')
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

console.log('Using API URL:', API_URL);
export default API_URL; 