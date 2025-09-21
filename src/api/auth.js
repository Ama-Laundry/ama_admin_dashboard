// src/api/auth.js


const API_URL = "https://amalaundry.com.au/wp-json/jwt-auth/v1/token";
const BASE_API_URL = "https://amalaundry.com.au/wp-json/wp/v2";

/**
 * Logs in the admin and stores the JWT token in localStorage.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} - User data including token
 */
export async function loginAdmin(username, password) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      throw new Error(data.message || "Login failed. Check credentials.");
    }

    localStorage.setItem("jwt", data.token);
    return data;
  } catch (err) {
    console.error("Login error:", err);
    throw new Error(
      "Could not connect to the authentication server. Check network or CORS settings."
    );
  }
}

/**
 * Retrieves the stored JWT token from localStorage.
 * @returns {string|null}
 */
export function getToken() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    console.warn("JWT token not found. User may not be logged in.");
  }
  return token;
}

/**
 * Clears the JWT token from localStorage.
 */
export function logoutAdmin() {
  localStorage.removeItem("jwt");
  console.log("Logged out successfully.");
}

/**
 * Makes an authenticated GET request to the WordPress REST API.
 * @param {string} endpoint - e.g. "laundry_order"
 * @returns {Promise<object>} - JSON response
 */
export async function getAuthenticatedData(endpoint) {
  const token = getToken();
  if (!token) {
    throw new Error("No token found. Please log in first.");
  }

  try {
    const res = await fetch(`${BASE_API_URL}/${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Invalid JSON response:", raw);
      throw new Error("Server returned malformed data.");
    }

    if (!res.ok) {
      throw new Error(data.message || `API error: ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Error fetching ${endpoint}:`, err);
    throw err;
  }
}

// // src/api/auth.js

// const API_URL = "https://amalaundry.com.au/wp-json/jwt-auth/v1/token"

// /**
//  * Logs in the admin and stores JWT token in localStorage
//  * @param {string} username
//  * @param {string} password
//  * @returns {Promise<object>} user data including token
//  */
// export async function loginAdmin(username, password) {
//   try {
//     const res = await fetch(API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ username, password })
//     })

//     const data = await res.json()

//     if (res.ok && data.token) {
//       localStorage.setItem("jwt", data.token)
//       return data
//     } else {
//       throw new Error(data.message || "Login failed")
//     }
//   } catch (err) {
//     console.error("Login error:", err)
//     throw err
//   }
// }

// /**
//  * Retrieves the stored JWT token from localStorage
//  * @returns {string|null}
//  */
// export function getToken() {
//   const token = localStorage.getItem("jwt")
//   if (!token) {
//     console.warn("JWT token not found in localStorage")
//   }
//   return token
// }

// /**
//  * Logs out the admin by clearing the token
//  */
// export function logoutAdmin() {
//   localStorage.removeItem("jwt")
// }
