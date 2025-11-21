// src/api/auth.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_URL = `${API_BASE_URL}/ama/v1/login`;
const LOGOUT_URL = `${API_BASE_URL}/ama/v1/logout`;
const VERIFY_2FA_URL = `${API_BASE_URL}/ama/v1/verify-2fa`; // New Endpoint
const UPDATE_PASSWORD_URL = `${API_BASE_URL}/ama/v1/user/update-password`;

/**
 * Logs the admin in.
 * Now sends 'device_token' if available to support "Trust this Device".
 */
export async function loginAdmin(username, password) {
  if (!API_BASE_URL) {
    throw new Error(
      "API base URL is not configured. Please check your .env file."
    );
  }

  // 1. Retrieve the stored device token (if it exists from a previous trust)
  const deviceToken = localStorage.getItem("ama_device_token");

  try {
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // 2. Send the device token along with credentials
      body: JSON.stringify({
        username,
        password,
        device_token: deviceToken,
      }),
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

    // Returns: { success: true, nonce: '...', data: {...} }
    // OR: { success: false, requires_2fa: true, user_id: 123 }
    return await res.json();
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

/**
 * Verifies the 2FA OTP code.
 * @param {number} userId - The ID of the user trying to login.
 * @param {string} otp - The 6-digit code entered by the user.
 * @param {boolean} saveDevice - Whether to trust this device for future logins.
 */
export async function verify2FA(userId, otp, saveDevice) {
  try {
    const res = await fetch(VERIFY_2FA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        otp,
        save_device: saveDevice,
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Verification failed");
    }

    return await res.json();
  } catch (err) {
    console.error("2FA Verification error:", err);
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
    // Note: We do NOT clear 'ama_device_token' here so trusted devices persist
  }
}
