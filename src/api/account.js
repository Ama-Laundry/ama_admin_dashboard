const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CUSTOM_API_BASE = `${API_BASE_URL}/ama/v1`;

// Helper function to get cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const apiRequest = async (endpoint, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
  };

  const nonce = localStorage.getItem("wpNonce");
  if (nonce) {
    headers["X-WP-Nonce"] = nonce;
  }

  const jwtToken = getCookie("jwt_token");
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  const options = {
    method,
    headers,
    credentials: "include",
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${CUSTOM_API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export const getCurrentUser = () => apiRequest("user/me");

export const updateUserProfile = (data) => apiRequest("user/me", "POST", data);
