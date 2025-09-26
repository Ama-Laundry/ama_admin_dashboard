// src/api/auth.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_URL = `${API_BASE_URL}/ama/v1/login`;
const LOGOUT_URL = `${API_BASE_URL}/ama/v1/logout`;

export async function loginAdmin(username, password) {
  // Check if the API URL is defined
  if (!API_BASE_URL) {
    throw new Error(
      "API base URL is not configured. Please check your .env file."
    );
  }

  try {
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    // Check for network errors (like 404) before trying to parse JSON
    if (!res.ok) {
      // Try to get a more specific error message from the body if possible
      const errorData = await res
        .json()
        .catch(() => ({ message: "An unknown error occurred." }));
      throw new Error(
        errorData.message || `Login failed with status: ${res.status}`
      );
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Login error:", err);
    // Re-throw the error so the component can catch it
    throw err;
  }
}

export async function logoutAdmin() {
  try {
    await fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "include",
    });
    console.log("Logged out successfully.");
  } catch (err) {
    console.error("Logout error:", err);
  }
}
