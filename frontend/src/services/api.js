/**
 * API Service for AI Interview Preparation Platform
 * Configures base URL using Vite environment variables and handles requests.
 */

// Fallback to production URL if env variable is not set
const API_URL = import.meta.env.VITE_API_URL || 'https://ai-interview-preparation-platform-p5g3.onrender.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic request helper with error handling and retry mechanism for cold starts
 */
const request = async (endpoint, options = {}, retries = 5, delay = 3000) => {
  // Ensure we don't have double slashes if endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Render returns 502/503/504 status codes while container is spinning up
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(`Server is starting up (Status ${response.status})`);
      }

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

      if (options.responseType === 'blob') {
        return await response.blob();
      }

      return await response.json();
    } catch (error) {
      // Check if it's a network/timeout/cold start error
      const isNetworkError = 
        error.message.includes('Failed to fetch') || 
        error.message.includes('starting up') ||
        error.message.includes('Status 502') ||
        error.message.includes('Status 503') ||
        error.message.includes('Status 504');

      if (isNetworkError && i < retries) {
        console.warn(
          `Request to ${cleanEndpoint} failed (server might be waking up). Retrying in ${delay / 1000}s... (Attempt ${i + 1} of ${retries})`
        );
        await sleep(delay);
        // Exponential backoff
        delay = Math.round(delay * 1.5);
        continue;
      }

      throw error;
    }
  }
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

/**
 * Resume & AI Interview API Endpoints
 */
export const resumeApi = {
  /**
   * Get resume upload status (whether user has uploaded a resume)
   */
  getStatus: (token) => {
    return request('/api/resume/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Upload resume file (PDF, DOCX, TXT)
   */
  upload: (formData, token) => {
    return request('/api/resume/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Get PDF preview blob
   */
  getPreviewBlob: (token) => {
    return request('/api/resume/preview', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  },

  /**
   * Generate 10 interview questions based on the candidate's resume
   */
  generateQuestions: (token) => {
    return request('/api/resume/generate-questions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Submit answers and receive AI feedback
   */
  submitFeedback: (questions, answers, token) => {
    return request('/api/resume/feedback', {
      method: 'POST',
      body: JSON.stringify({ questions, answers }),
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
