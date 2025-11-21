// src/api/controlPanel.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;
const CUSTOM_API_BASE = `${API_BASE_URL}/ama/v1`;

// This helper will now be used by all other api files
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

  const response = await fetch(`${API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    let errorMessage = "API request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || `HTTP ${response.status}`;

      if (response.status === 401 || response.status === 403) {
        errorMessage = "Authentication failed. Please log in again.";
        localStorage.removeItem("wpNonce");
        localStorage.removeItem("ama_user");
        window.location.reload();
      }
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return { success: true };
  }
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

// This helper will also be used by other api files
export const customApiRequest = async (
  endpoint,
  method = "POST",
  body = null
) => {
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

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${CUSTOM_API_BASE}/${endpoint}`, options);

  if (!response.ok) {
    let errorMessage = `Request to ${endpoint} failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;

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
};

//
// --- THE REST OF THE FILE ---
// (Now using the corrected helpers)
//

export const getSettings = async () => {
  const [services, pickupSlots, siteSettings] = await Promise.all([
    apiRequest("service?per_page=100"),
    apiRequest("pickup_slot?per_page=100"),
    // This is a protected route, so we use the default auth
    customApiRequest("site-settings", "GET"),
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
    dailyAvailability: siteSettings.daily_availability,
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

// +++ NEW FUNCTION TO UPDATE SERVICE NAME (POST TITLE) +++
export const updateServiceName = (id, name) => {
  return apiRequest(`service/${id}`, "POST", {
    title: name,
  });
};
// +++ END OF NEW FUNCTION +++

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
      return { id: id, image: mediaData.source_url };
    } catch (acfError) {
      console.log("Trying with image URL instead of ID");
      await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: mediaData.source_url,
        },
      });
      return { id: id, image: mediaData.source_url };
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
      await apiRequest(`service/${id}`, "POST", { acf: { image: null } });
    } catch (nullError) {
      console.log("Trying with empty string instead of null");
      await apiRequest(`service/${id}`, "POST", { acf: { image: "" } });
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
    acf: { time: time, is_active: true },
  });
};

export const deletePickupSlot = (id) => {
  return apiRequest(`pickup_slot/${id}`, "DELETE", { force: true });
};

export const updateSettings = (settings) => {
  console.log("Updating general settings:", settings);
  return customApiRequest("site-settings", "POST", settings);
};

// --- PAYMENT GATEWAY FUNCTIONS ---

export const getPaymentGateways = async () => {
  // This is a protected route, so we use the default auth
  return customApiRequest("payment-gateways", "GET");
};

export const updatePaymentGateways = async (gateways) => {
  return customApiRequest("payment-gateways", "POST", gateways);
};
