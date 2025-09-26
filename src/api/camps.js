// src/api/camps.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `${API_BASE_URL}/wp/v2`;

/**
 * Fetches all camps from the WordPress backend.
 */
export async function fetchCamps() {
  const response = await fetch(`${API_BASE}/camp?per_page=100`, {
    credentials: "include",
  });

  if (!response.ok) throw new Error("Failed to fetch camps.");
  const data = await response.json();
  return data.map((camp) => ({ id: camp.id, name: camp.title.rendered }));
}

/**
 * Creates a new camp.
 * @param {string} name - The name of the new camp.
 */
export async function createCamp(name) {
  const response = await fetch(`${API_BASE}/camp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      title: name,
      status: "publish",
    }),
  });

  if (!response.ok) throw new Error("Failed to create camp.");
  return await response.json();
}

/**
 * Updates an existing camp's name.
 * @param {number} id - The ID of the camp to update.
 * @param {string} name - The new name for the camp.
 */
export async function updateCamp(id, name) {
  const response = await fetch(`${API_BASE}/camp/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ title: name }),
  });

  if (!response.ok) throw new Error("Failed to update camp.");
  return await response.json();
}

/**
 * Deletes a camp.
 * @param {number} id - The ID of the camp to delete.
 */
export async function deleteCamp(id) {
  const response = await fetch(`${API_BASE}/camp/${id}`, {
    method: "DELETE",
    credentials: "include",
    body: JSON.stringify({ force: true }),
  });

  if (!response.ok) throw new Error("Failed to delete camp.");
  return await response.json();
}
