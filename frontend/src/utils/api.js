/**
 * API Utility - Handles all backend URL resolution
 * Works on both local development and production (Render)
 */

export const getBackendUrl = () => {
  // Priority 1: Use environment variable if set (local development)
  if (import.meta.env.VITE_BACKEND_URL) {
    console.log('✅ Using VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Priority 2: Use production URL as fallback (most reliable)
  const productionUrl = 'https://telegram-bot-u2ni.onrender.com';
  console.log('✅ Using production URL fallback:', productionUrl);
  return productionUrl;
};

/**
 * Helper function for API calls with automatic URL resolution
 * @param {string} endpoint - API endpoint (e.g., '/api/user/123')
 * @param {object} options - Fetch options
 * @returns {Promise} - Response JSON
 */
export const apiCall = async (endpoint, options = {}) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}${endpoint}`;
  
  console.log('📡 API Call:', url);
  console.log('📤 Method:', options.method || 'GET');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    console.log('📊 Response Status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ API Error:', `HTTP ${response.status}`, errorData);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Fetch Error:', error.message);
    throw error;
  }
};

/**
 * Shorthand for GET requests
 */
export const apiGet = (endpoint) => {
  return apiCall(endpoint, { method: 'GET' });
};

/**
 * Shorthand for POST requests
 */
export const apiPost = (endpoint, body) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

/**
 * Get user balance and data
 */
export const getUserData = async (telegramId) => {
  return apiGet(`/api/user/${telegramId}`);
};

export default {
  getBackendUrl,
  apiCall,
  apiGet,
  apiPost,
  getUserData
};
