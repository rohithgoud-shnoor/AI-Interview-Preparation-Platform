/**
 * API Service for AI Interview Preparation Platform
 * Configures base URL using Vite environment variables and handles requests.
 */

// Fallback to production URL if env variable is not set
const API_URL = import.meta.env.VITE_API_URL || 'https://ai-interview-preparation-platform-p5g3.onrender.com';

/**
 * Generic request helper with error handling
 */
const request = async (endpoint, options = {}) => {
  // Ensure we don't have double slashes if endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Something went wrong';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorDetail;
    } catch (e) {
      // JSON parsing failed, use response status text if available
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
};

/**
 * Auth API Endpoints
 */
export const authApi = {
  /**
   * Register a new user
   */
  register: (name, email, password) => {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  /**
   * Log in user
   */
  login: (email, password) => {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Google sign-in
   */
  googleLogin: (token) => {
    return request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  /**
   * Get current logged-in user profile details
   */
  getMe: (token) => {
    return request('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
