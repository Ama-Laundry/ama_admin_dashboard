// src/api/camps.js
// +++ MODIFIED: Import the fixed helper +++
import { apiRequest } from "./controlPanel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;

/**
 * Fetches all camps from the WordPress backend.
 */
export async function fetchCamps() {
  // +++ MODIFIED: Use the imported helper +++
  const data = await apiRequest("camp?per_page=100");
  return data.map((camp) => ({ id: camp.id, name: camp.title.rendered }));
}

/**
 * Creates a new camp.
 * @param {string} name - The name of the new camp.
 */
export async function createCamp(name) {
  // +++ MODIFIED: Use the imported helper +++
  return apiRequest("camp", "POST", {
    title: name,
    status: "publish",
  });
}

/**
 * Updates an existing camp's name.
 * @param {number} id - The ID of the camp to update.
 * @param {string} name - The new name for the camp.
 */
export async function updateCamp(id, name) {
  // +++ MODIFIED: Use the imported helper +++
  return apiRequest(`camp/${id}`, "POST", {
    title: name,
  });
}

/**
 * Deletes a camp.
 * @param {number} id - The ID of the camp to delete.
 */
export async function deleteCamp(id) {
  // +++ MODIFIED: Use the imported helper +++
  return apiRequest(`camp/${id}`, "DELETE", {
    force: true,
  });
}
