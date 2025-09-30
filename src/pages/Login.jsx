// src/pages/Login.jsx

import { useState } from "react";
import amaLogo from "../assets/ama_logo.png";
import { loginAdmin } from "../api/auth";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginAdmin(username, password);

      // A successful response should contain the nonce and user data
      if (response && response.nonce && response.data) {
        localStorage.setItem("wpNonce", response.nonce);
        onLogin(response.data); // Pass the user object to the App component
      } else {
        throw new Error("Invalid response from server. Login failed.");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      // Ensure local storage is clear on failure
      localStorage.removeItem("wpNonce");
      localStorage.removeItem("ama_user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="header-logo-container">
        <img src={amaLogo} alt="AMA Logo" className="header-logo" />
      </div>

      <div className="text-center">
        <h1 className="header-title">Admin Dashboard</h1>
        <p className="header-subtitle">Manage laundry booking services.</p>
      </div>

      <form onSubmit={handleSubmit} className="card login-form">
        <h2 className="card-title">Admin Login</h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            disabled={loading}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          className="btn-add w-full mt-6"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
