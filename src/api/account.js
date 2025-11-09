// src/api/account.js
// +++ MODIFIED: Import the fixed helper +++
import { customApiRequest } from "./controlPanel";

// --- All local helper functions are REMOVED ---

export const getCurrentUser = () => {
  // +++ MODIFIED: Use the imported helper +++
  return customApiRequest("user/me", "GET");
};

export const updateUserProfile = (data) => {
  // +++ MODIFIED: Use the imported helper +++
  return customApiRequest("user/me", "POST", data);
};
