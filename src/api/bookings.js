// src/api/bookings.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;
const CUSTOM_API_BASE = `${API_BASE_URL}/ama/v1`;

// Helper function to get cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

// Enhanced API request function
const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) => {
  const headers = {};

  // Get nonce from localStorage
  const nonce = localStorage.getItem("wpNonce");
  if (nonce) {
    headers["X-WP-Nonce"] = nonce;
  }

  // --- CHANGED: REMOVED JWT TOKEN LOGIC ---
  // The logic for 'jwt_token' was removed from here
  // as it conflicts with cookie/nonce authentication.

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

  console.log(`Making ${method} request to ${endpoint}`, {
    headers: {
      ...headers,
      // --- CHANGED: REMOVED AUTHORIZATION HEADER FROM LOG ---
    },
  });

  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.code || errorMessage;

        if (response.status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
          // Clear auth data on 401
          localStorage.removeItem("wpNonce");
          // --- CHANGED: Corrected item to remove ---
          localStorage.removeItem("ama_user"); // Was 'userLoggedIn'
        }
      } catch (parseError) {
        console.warn("Could not parse error response:", parseError);
      }

      throw new Error(errorMessage);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Helper function to fetch all items of a certain type
async function fetchAll(type) {
  try {
    // Use the robust apiRequest function for the GET request
    const data = await apiRequest(`${type}?per_page=100`);
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${type}:`, err.message);
    return []; // Return an empty array on failure
  }
}

export async function fetchLaundryOrders() {
  try {
    const [orders, services, pickupSlots, camps] = await Promise.all([
      fetchAll("laundry_order"),
      fetchAll("service"),
      fetchAll("pickup_slot"),
      fetchAll("camp"),
    ]);

    if (!Array.isArray(orders)) {
      console.error("Fetched orders data is not an array:", orders);
      return [];
    }

    const servicesMap = new Map(services.map((s) => [s.id, s]));
    const pickupSlotsMap = new Map(pickupSlots.map((s) => [s.id, s]));
    const campsMap = new Map(
      camps.map((c) => [c.id, c.title?.rendered || "Unknown Camp"])
    );

    return orders.map((order) => {
      const acf = order.acf || {};
      const serviceIds = Array.isArray(acf.service_id)
        ? acf.service_id
        : [acf.service_id].filter(Boolean);

      const fetchedServices = serviceIds
        .map((id) => servicesMap.get(id))
        .filter(Boolean)
        .map((service) => ({
          id: service.id,
          name: service.title?.rendered || "",
          slug: service.acf?.slug || "",
          price: service.acf?.price || "",
        }));

      const slot = pickupSlotsMap.get(acf.slot_id);

      const campId = Array.isArray(acf.camp_name)
        ? acf.camp_name[0]
        : acf.camp_name;
      const campName = campsMap.get(campId) || "—";

      return {
        id: order.id,
        title: order.title?.rendered || "",
        customer_name: acf.customer_name || "—",
        room_number: acf.room_number || "—",
        pickup_method: acf.pickup_method || "—",
        payment_confirmed: acf.payment_confirmed || false,
        total_price: acf.total_price || "0.00",
        special_instructions: acf.Special_Instructions || "—",
        order_status: acf.order_status || "pending",
        order_timestamp: acf.order_timestamp || "—",
        camp_name: campName,
        services: fetchedServices,
        pickup_slot: slot,
        date_created: order.date || order.date_created || order.modified,
      };
    });
  } catch (error) {
    console.error("Error fetching laundry orders:", error);
    throw new Error("Failed to load orders. Please check your authentication.");
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Get nonce from localStorage
    const nonce = localStorage.getItem("wpNonce");
    if (nonce) {
      headers["X-WP-Nonce"] = nonce;
    }

    // --- CHANGED: REMOVED JWT TOKEN LOGIC ---
    // The logic for 'jwt_token' was removed from here

    // Fallback to wpData if available (for admin pages)
    if (typeof wpData !== "undefined" && wpData.nonce && !nonce) {
      headers["X-WP-Nonce"] = wpData.nonce;
      // Also store it in localStorage for future use
      localStorage.setItem("wpNonce", wpData.nonce);
    }

    console.log(`Updating order ${orderId} status to ${status}`, {
      headers: {
        ...headers,
        // --- CHANGED: REMOVED AUTHORIZATION HEADER FROM LOG ---
      },
    });

    const response = await fetch(`${CUSTOM_API_BASE}/orders/${orderId}`, {
      method: "PUT",
      headers: headers,
      credentials: "include",
      body: JSON.stringify({
        acf: { order_status: status },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("wpNonce");
        // --- CHANGED: Corrected item to remove ---
        localStorage.removeItem("ama_user"); // Was 'userLoggedIn'
        throw new Error("Authentication failed. Please log in again.");
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

// Additional utility functions
export const verifyAuth = async () => {
  try {
    const response = await fetchAll("service?per_page=1");
    return { authenticated: true };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
};

export async function logoutUser() {
  try {
    const headers = { "Content-Type": "application/json" };
    const nonce = localStorage.getItem("wpNonce");
    if (nonce) {
      headers["X-WP-Nonce"] = nonce;
    }

    await fetch(`${CUSTOM_API_BASE}/logout`, {
      method: "POST",
      headers,
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout API call failed:", error);
  } finally {
    // Always clear local storage
    localStorage.removeItem("wpNonce");
    // --- CHANGED: Corrected item to remove ---
    localStorage.removeItem("ama_user"); // Was 'userLoggedIn'
  }
}
