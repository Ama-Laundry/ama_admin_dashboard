import { getToken } from "./auth";

const API_BASE = "https://amalaundry.com.au/wp-json/wp/v2";

const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) => {
  const token = getToken();
  if (!token) throw new Error("Authentication token not found.");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Ensure wpData and its nonce property are available
  if (typeof wpData !== "undefined" && wpData.nonce) {
    headers["X-WP-Nonce"] = wpData.nonce;
  }

  const options = {
    method,
    headers,
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
  // Fetch all data in parallel for faster loading
  const [services, pickupSlots, paymentMethodsData] = await Promise.all([
    apiRequest("service?per_page=100"),
    apiRequest("pickup_slot?per_page=100"),
    apiRequest("payment_method?per_page=100").catch((err) => {
      console.error("Could not fetch payment methods:", err);
      return []; // Return an empty array to prevent UI from breaking
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

  // Replaces mocked data with data from the backend
  const paymentMethods = paymentMethodsData.map((method) => ({
    id: method.id,
    name: method.title.rendered,
  }));

  // Daily availability is still mocked as there is no endpoint for it
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
    const token = getToken();

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    if (typeof wpData !== "undefined" && wpData.nonce) {
      headers["X-WP-Nonce"] = wpData.nonce;
    }

    // First upload the image to WordPress media library
    // WordPress expects the file parameter to be named 'file' not 'image'
    const mediaResponse = await fetch(`${API_BASE}/media`, {
      method: "POST",
      headers: headers,
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

    // Then update the service with the new image ID using ACF field
    // Try both approaches: image ID and image URL
    try {
      const updatedService = await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: imageId, // Try with image ID first
        },
      });

      return {
        id: id,
        image: mediaData.source_url, // Return the image URL for display
      };
    } catch (acfError) {
      console.log("Trying with image URL instead of ID");
      // If image ID doesn't work, try with image URL
      const updatedService = await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: mediaData.source_url, // Try with image URL
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
    // Update the service to remove the image reference
    // Try different approaches for clearing the image field
    try {
      const updatedService = await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: null, // Set image field to null
        },
      });
    } catch (nullError) {
      console.log("Trying with empty string instead of null");
      // If null doesn't work, try with empty string
      const updatedService = await apiRequest(`service/${id}`, "POST", {
        acf: {
          image: "", // Set image field to empty string
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
      // Creates a slug-like provider_code from the name for the backend
      provider_code: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      is_active: true,
    },
  });
};

export const deletePaymentMethod = (id) => {
  return apiRequest(`payment_method/${id}`, "DELETE", { force: true });
};

export const updateSettings = (settings) => {
  // Placeholder for general settings updates
  console.log("Updating general settings:", settings);
  return Promise.resolve({ success: true });
};
