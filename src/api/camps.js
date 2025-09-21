import { getToken } from './auth';

const API_BASE = "https://amalaundry.com.au/wp-json/wp/v2";

/**
 * Fetches all camps from the WordPress backend.
 */
export async function fetchCamps() {
  const token = getToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE}/camp?per_page=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error("Failed to fetch camps.");
  const data = await response.json();
  // Map to a simpler { id, name } format
  return data.map(camp => ({ id: camp.id, name: camp.title.rendered }));
}

/**
 * Creates a new camp.
 * @param {string} name - The name of the new camp.
 */
export async function createCamp(name) {
  const token = getToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE}/camp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: name,
      status: 'publish', // WordPress requires a status
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
  const token = getToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE}/camp/${id}`, {
    method: 'POST', // WordPress uses POST for updates
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const token = getToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE}/camp/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ force: true }) // Use true to bypass trash
  });

  if (!response.ok) throw new Error("Failed to delete camp.");
  return await response.json();
}
