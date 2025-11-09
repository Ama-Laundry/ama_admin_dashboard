// src/pages/Account.jsx

import { useState } from "react";
import Card from "../components/Card";
import { updatePassword } from "../api/auth";

export default function Account({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("❌ New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const response = await updatePassword(currentPassword, newPassword);
      setMessage(`✅ ${response.message}`);
      // Clear fields on success
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card title="Profile Settings">
        <p className="text-lg">
          Welcome,{" "}
          <strong className="font-semibold">
            {user?.display_name || "Admin"}
          </strong>
          .
        </p>
        <p className="text-slate-500">
          Manage your account settings and password here.
        </p>
      </Card>

      <Card title="Change Password">
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="New Password (min. 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
          <button type="submit" className="btn-add w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
          {message && (
            <p
              className={`text-center mt-4 p-2 rounded ${
                message.startsWith("✅")
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </Card>

      <Card title="Session">
        {/* MODIFIED: Replaced fixed flex layout with responsive flex classes */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p>
            You are logged in as{" "}
            <strong>{user?.display_name || "Admin"}</strong>.
          </p>
          {/* MODIFIED: Added w-full and sm:w-auto for responsive button width */}
          <button className="btn-danger w-full sm:w-auto" onClick={onLogout}>
            Logout
          </button>
        </div>
      </Card>
    </>
  );
}
