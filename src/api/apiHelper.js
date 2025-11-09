// src/api/apiHelper.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;
const CUSTOM_API_BASE = `${API_BASE_URL}/ama/v1`;

// This is the robust helper for /wp/v2/ endpoints
export const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) => {
  const headers = {};
  const nonce = localStorage.getItem("wpNonce");
  if (nonce) {
    headers["X-WP-Nonce"] = nonce;
  }

  const options = {
    method,
    headers,
    credentials: "include",
  };

  if (body && !isFormData) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  } else if (body && isFormData) {
    options.body = body;
  }

  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.code || errorMessage;

        // +++ THE FIX +++
        // If auth fails (401 or 403), log the user out
        if (response.status === 401 || response.status === 403) {
          errorMessage = "Authentication failed. Please log in again.";
          localStorage.removeItem("wpNonce");
          localStorage.removeItem("ama_user");
          // Force a page reload to send user to login screen
          window.location.reload(); 
        }
      } catch (parseError) {
        console.warn("Could not parse error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return { success: true };
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
    
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

// This is the robust helper for /ama/v1/ endpoints
export const customApiRequest = async (endpoint, method = "POST", body = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };
  const nonce = localStorage.getItem("wpNonce");
  if (nonce) {
    headers["X-WP-Nonce"] = nonce;
  }

  const options = {
    method,
    headers,
    credentials: "include",
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Use 'GET' if no body is provided and method is not set
  if (method === "GET") {
     delete options.body;
     options.method = "GET";
  }

  try {
    const response = await fetch(`${CUSTOM_API_BASE}/${endpoint}`, options);

    if (!response.ok) {
      let errorMessage = `Request to ${endpoint} failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `HTTP ${response.status}`;

        // +++ THE FIX +++
        if (response.status === 401 || response.status === 403) {
          errorMessage = "Authentication failed. Please log in again.";
          localStorage.removeItem("wpNonce");
          localStorage.removeItem("ama_user");
          window.location.reload();
        }
      } catch (parseError) {
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (error) {
    console.error(`Custom API Request failed for ${endpoint}:`, error);
    throw error;
  }
};
