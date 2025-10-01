// src/api/controlPanel.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;

// NEW: Define a base URL for our custom endpoints
const CUSTOM_API_BASE = `${API_BASE_URL}/ama/v1`;

const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) => {
  const headers = {};
  const nonce = localStorage.getItem("wpNonce"); // Get nonce from localStorage

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

  const response = await fetch(`${API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Failed to ${method} ${endpoint} with status ${response.status}`,
    }));
    throw new Error(errorData.message);
  }

  if (response.status === 204) {
    return { success: true };
  }
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

// NEW: A dedicated request function for custom /ama/v1 endpoints
const customApiRequest = async (endpoint, method = "POST", body = {}) => {
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
    body: JSON.stringify(body),
  };

  const response = await fetch(`${CUSTOM_API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Request to ${endpoint} failed.`
    );
  }
  return response.json();
};



export const getSettings = async () => {
  // MODIFIED: Fetch site settings in parallel
  const [services, pickupSlots, siteSettings] = await Promise.all([
    apiRequest("service?per_page=100"),
    apiRequest("pickup_slot?per_page=100"),
    // Fetch from our new GET endpoint
    fetch(`${CUSTOM_API_BASE}/site-settings`).then((res) => res.json()),
  ]);

  const prices = services.map((service) => ({
    id: service.id,
    name: service.title.rendered,
    price: service.acf.price || 0,
  }));

  const slots = pickupSlots.map((slot) => ({
    id: slot.id,
    time: slot.acf.time,
  }));

  return {
    prices,
    pickupSlots: slots,
    dailyAvailability: siteSettings.dailyAvailability,
  };
};

export const getServices = async () => {
  try {
    const services = await apiRequest("service?per_page=100");
    return services.map((service) => ({
      id: service.id,
      name: service.title.rendered,
      image: service.acf?.image || null,
    }));
  } catch (error) {
    console.error("Failed to fetch services:", error);
    throw new Error("Failed to load services. Please try again later.");
  }
};

export const updateServicePrice = (id, price) => {
  return apiRequest(`service/${id}`, "POST", {
    acf: {
      price: parseFloat(price) || 0,
    },
  });
};

export const updateServiceImage = async (id, formData) => {
  try {
    const headers = {};
    const nonce = localStorage.getItem("wpNonce");
    if (nonce) {
      headers["X-WP-Nonce"] = nonce;
    }

    const mediaResponse = await fetch(`${API_BASE}/media`, {
      method: "POST",
      headers: headers,
      credentials: "include",
      body: formData,
    });

    if (!mediaResponse.ok) {
      const errorData = await mediaResponse.json().catch(() => ({}));
      console.error("Media upload error:", errorData);
      throw new Error(
        errorData.message || "Failed to upload image to media library"
      );
    }

    const mediaData = await mediaResponse.json();
    const imageId = mediaData.id;

    try {
      await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: imageId,
        },
      });

      return {
        id: id,
        image: mediaData.source_url,
      };
    } catch (acfError) {
      console.log("Trying with image URL instead of ID");
      await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: mediaData.source_url,
        },
      });

      return {
        id: id,
        image: mediaData.source_url,
      };
    }
  } catch (error) {
    console.error("Failed to update service image:", error);
    throw new Error(
      error.message || "Failed to update image. Please try again."
    );
  }
};

export const deleteServiceImage = async (id) => {
  try {
    try {
      await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: null,
        },
      });
    } catch (nullError) {
      console.log("Trying with empty string instead of null");
      await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: "",
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete service image:", error);
    throw new Error(
      error.message || "Failed to delete image. Please try again."
    );
  }
};

export const createPickupSlot = (time) => {
  return apiRequest("pickup_slot", "POST", {
    title: time,
    status: "publish",
    acf: {
      time: time,
      is_active: true,
    },
  });
};

export const deletePickupSlot = (id) => {
  return apiRequest(`pickup_slot/${id}`, "DELETE", { force: true });
};

// MODIFIED: Implement the updateSettings function
export const updateSettings = (settings) => {
  console.log("Updating general settings:", settings);
  // Call our new POST endpoint
  return customApiRequest("site-settings", "POST", settings);
};

// --- PAYMENT GATEWAY FUNCTIONS ---

export const getPaymentGateways = async () => {
  const response = await fetch(`${CUSTOM_API_BASE}/payment-gateways`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": localStorage.getItem("wpNonce"),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch payment gateways.");
  }
  return response.json();
};

export const updatePaymentGateways = async (gateways) => {
  const response = await fetch(`${CUSTOM_API_BASE}/payment-gateways`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": localStorage.getItem("wpNonce"),
    },
    credentials: "include",
    body: JSON.stringify(gateways),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update payment gateways.");
  }
  return response.json();
};
