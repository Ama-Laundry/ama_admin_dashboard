// src/pages/Login.jsx

import { useState } from "react";
import amaLogo from "../assets/ama_logo.png";
//
// Import the new verify2FA function along with loginAdmin
import { loginAdmin, verify2FA } from "../api/auth";

export default function Login({ onLogin }) {
  // Step 1: Credentials State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: 2FA State
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [tempUserId, setTempUserId] = useState(null);
  const [trustDevice, setTrustDevice] = useState(true); // Default: Trust this device

  // UI State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!is2FAStep) {
        // ==========================================
        // STEP 1: Attempt Initial Login
        // ==========================================
        const response = await loginAdmin(username, password);

        if (response.requires_2fa) {
          // Credentials are correct, but 2FA is required
          setIs2FAStep(true);
          setTempUserId(response.user_id);
          setError("Please enter the code sent to your email.");
        } else if (response.success && response.nonce && response.data) {
          // Login successful immediately (Trusted Device)
          localStorage.setItem("wpNonce", response.nonce);
          onLogin(response.data);
        } else {
          throw new Error("Invalid response from server.");
        }
      } else {
        // ==========================================
        // STEP 2: Verify OTP Code
        // ==========================================
        const response = await verify2FA(tempUserId, otp, trustDevice);

        if (response.success && response.nonce && response.data) {
          // 2FA Verified!
          localStorage.setItem("wpNonce", response.nonce);

          // Save the new Trusted Device Token if the backend sent one
          if (response.device_token) {
            localStorage.setItem("ama_device_token", response.device_token);
          }

          onLogin(response.data);
        } else {
          throw new Error("Verification failed. Please try again.");
        }
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      // Only clear session if we haven't reached the 2FA step yet
      if (!is2FAStep) {
        localStorage.removeItem("wpNonce");
        localStorage.removeItem("ama_user");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container flex flex-col items-center justify-center min-h-screen p-4 gap-8">
      <div className="header-logo-container">
        <img src={amaLogo} alt="AMA Logo" className="header-logo" />
      </div>

      <div className="text-center">
        <h1 className="header-title">Admin Dashboard</h1>
        <p className="header-subtitle">
          {is2FAStep
            ? "Two-Factor Authentication"
            : "Manage laundry booking services."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card login-form w-full max-w-md">
        <h2 className="card-title text-center">
          {is2FAStep ? "Verify Identity" : "Admin Login"}
        </h2>

        <div className="space-y-4">
          {!is2FAStep ? (
            // --- VIEW 1: USERNAME & PASSWORD ---
            <>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input text-black"
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
            </>
          ) : (
            // --- VIEW 2: OTP CODE ENTRY ---
            <>
              <p className="text-center text-sm text-gray-600 mb-2">
                We sent a 6-digit code to the admin email.
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="form-input text-center text-xl tracking-widest font-bold"
                disabled={loading}
                required
                maxLength={6}
                autoFocus
              />

              <label className="flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer select-none text-black">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Trust this device for future logins
              </label>
            </>
          )}
        </div>

        {/* Error Message Display */}
        {error && (
          <p
            className={`text-sm mt-4 text-center ${
              is2FAStep && !error.includes("failed")
                ? "text-blue-600"
                : "text-red-500"
            }`}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-add w-full mt-6"
          disabled={loading}
        >
          {loading ? "Processing..." : is2FAStep ? "Verify Code" : "Login"}
        </button>

        {/* Back Button (Only visible during Step 2) */}
        {is2FAStep && (
          <button
            type="button"
            onClick={() => {
              setIs2FAStep(false);
              setOtp("");
              setError("");
            }}
            className="w-full mt-4 text-sm text-gray-500 hover:text-black underline"
          >
            Back to Login
          </button>
        )}
      </form>
    </div>
  );
}
