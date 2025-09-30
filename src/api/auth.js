// src/api/auth.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_URL = `${API_BASE_URL}/ama/v1/login`;
const LOGOUT_URL = `${API_BASE_URL}/ama/v1/logout`;
const UPDATE_PASSWORD_URL = `${API_BASE_URL}/ama/v1/user/update-password`;

export async function loginAdmin(username, password) {
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

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "An unknown error occurred." }));
      throw new Error(
        errorData.message || `Login failed with status: ${res.status}`
      );
    }

    return await res.json();
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

/**
 * Updates the current user's password.
 * @param {string} current_password - The user's current password.
 * @param {string} new_password - The user's desired new password.
 */
export async function updatePassword(current_password, new_password) {
  const nonce = localStorage.getItem("wpNonce");

  if (!nonce) {
    throw new Error("Authentication error. Please log in again.");
  }

  try {
    const res = await fetch(UPDATE_PASSWORD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": nonce,
      },
      body: JSON.stringify({ current_password, new_password }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "An unknown error occurred on the server." }));
      throw new Error(
        errorData.message || `Password update failed with status: ${res.status}`
      );
    }

    return await res.json();
  } catch (err) {
    console.error("Password update error:", err);
    throw err;
  }
}

/**
 * Logs the user out by calling the WordPress logout endpoint and clearing local storage.
 */
export async function logoutAdmin() {
  try {
    await fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout API call failed, clearing session anyway:", err);
  } finally {
    // Always clear local storage regardless of API call success
    localStorage.removeItem("wpNonce");
    localStorage.removeItem("ama_user");
  }
}
