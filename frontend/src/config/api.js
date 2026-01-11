/**
 * API Configuration
 * 
 * Uses relative URLs to work correctly in any environment (preview, production, etc.)
 * This ensures API calls go to the same domain the app is served from.
 */

// Always use relative URLs for API calls
// This works because:
// - In preview: calls go to wapp-automation-1.preview.emergentagent.com/api/*
// - In production: calls go to mindora.pe/api/*
// - Locally: calls go to localhost:3000/api/* (proxied to backend)

export const API_BASE_URL = '';

// Helper function for API calls
export const getApiUrl = (endpoint) => {
  // Ensure endpoint starts with /api
  if (!endpoint.startsWith('/api')) {
    endpoint = `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
  return `${API_BASE_URL}${endpoint}`;
};

// For backwards compatibility with existing code
export const API_URL = API_BASE_URL;

export default {
  API_BASE_URL,
  API_URL,
  getApiUrl
};
