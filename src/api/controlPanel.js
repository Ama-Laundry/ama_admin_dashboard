// src/api/controlPanel.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;

const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) => {
  const headers = {};

  if (typeof wpData !== "undefined" && wpData.nonce) {
    headers["X-WP-Nonce"] = wpData.nonce;
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

export const getSettings = async () => {
  const [services, pickupSlots, paymentMethodsData] = await Promise.all([
    apiRequest("service?per_page=100"),
    apiRequest("pickup_slot?per_page=100"),
    apiRequest("payment_method?per_page=100").catch((err) => {
      console.error("Could not fetch payment methods:", err);
      return [];
    }),
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

  const paymentMethods = paymentMethodsData.map((method) => ({
    id: method.id,
    name: method.title.rendered,
  }));

  return {
    prices,
    pickupSlots: slots,
    paymentMethods,
    dailyAvailability: {
      isAvailable: true,
    },
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
    if (typeof wpData !== "undefined" && wpData.nonce) {
      headers["X-WP-Nonce"] = wpData.nonce;
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

export const createPaymentMethod = (name) => {
  return apiRequest("payment_method", "POST", {
    title: name,
    status: "publish",
    acf: {
      provider_code: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      is_active: true,
    },
  });
};

export const deletePaymentMethod = (id) => {
  return apiRequest(`payment_method/${id}`, "DELETE", { force: true });
};

export const updateSettings = (settings) => {
  console.log("Updating general settings:", settings);
  return Promise.resolve({ success: true });
};
