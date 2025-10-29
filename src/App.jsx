// src/App.jsx

import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js"; // Import Pusher
// Import the Pusher Beams Web SDK
import * as PusherPushNotifications from "@pusher/push-notifications-web";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Camps from "./pages/Camps";
import Statistics from "./pages/Statistics";
import ControlPanel from "./pages/ControlPanel";
import Account from "./pages/Account";
import Login from "./pages/Login";
import ToastNotification from "./components/Notification"; // <-- Updated import
import { logoutAdmin } from "./api/auth";

// Beams Token Provider function to fetch auth token from backend
const beamsTokenProvider = (userId) => {
  // Construct the URL for your backend authentication endpoint
  const beamsAuthEndpoint = `${
    import.meta.env.VITE_API_BASE_URL
  }/ama/v1/beams-auth`;
  const nonce = localStorage.getItem("wpNonce"); // Get the WP nonce

  // Return a TokenProvider instance required by the Beams SDK
  return new PusherPushNotifications.TokenProvider({
    url: beamsAuthEndpoint,
    method: "POST", // <-- This was already correct
    headers: {
      "Content-Type": "application/json",
      // Include the nonce in the headers for WordPress authentication
      "X-WP-Nonce": nonce || "",
    },
    // ++++++++++ START: CORRECTED SECTION ++++++++++
    // Send an empty body to force the request method to POST
    body: JSON.stringify({}),
    // ++++++++++ END: CORRECTED SECTION ++++++++++
    // Crucially, include credentials (cookies) for WordPress authentication
    withCredentials: true,
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null); // State for Channels notification

  // Ref to hold the Beams client instance across renders
  const beamsClientRef = useRef(null);

  // On initial load, check if user data exists in localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("ama_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      localStorage.removeItem("ama_user");
      setUser(null); // Ensure user is null if parsing fails
    }
  }, []);

  // --- MODIFIED: Combined Pusher Channels & Beams Initialization/Cleanup ---
  useEffect(() => {
    let pusherChannelsClient = null; // Variable for the Channels client
    // We use beamsClientRef.current for the Beams client

    // Only initialize if a user is logged in
    if (user) {
      // --- Initialize Pusher Channels (Existing Logic) ---
      const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
      const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

      if (pusherKey && pusherCluster) {
        pusherChannelsClient = new Pusher(pusherKey, {
          cluster: pusherCluster,
        });
        const channel = pusherChannelsClient.subscribe("orders-channel");

        channel.bind("new-order", (data) => {
          console.log("Pusher Channels: New Order Received", data);
          // Show the in-app toast notification
          setNotification(data.message);
        });
      } else {
        console.warn(
          "Pusher Channel keys not configured in .env file. In-app notifications are disabled."
        );
      }

      // --- Initialize Pusher Beams (New Logic) ---
      const beamsInstanceId = import.meta.env.VITE_PUSHER_BEAMS_INSTANCE_ID;

      if (beamsInstanceId) {
        // Only initialize if the client isn't already stored in the ref
        if (!beamsClientRef.current) {
          beamsClientRef.current = new PusherPushNotifications.Client({
            instanceId: beamsInstanceId,
            // If your service worker isn't at the root, specify path:
            // serviceWorkerRegistrationOptions: { scope: '/' },
          });
        }

        // Start the Beams client, request permission, authenticate, and subscribe
        beamsClientRef.current
          .start()
          .then(() => {
            console.log("Pusher Beams client started successfully.");
            // After starting, request permission from the user
            return Notification.requestPermission();
          })
          .then((permission) => {
            // Check if permission was granted
            if (permission === "granted") {
              console.log("Browser notification permission granted.");
              // Define the user ID for Beams (must match backend format)
              const beamsUserId = `admin_${user.id}`;
              console.log(`Authenticating Beams for user: ${beamsUserId}`);
              // Authenticate the user with your backend using the TokenProvider
              return beamsClientRef.current.setUserId(
                beamsUserId,
                beamsTokenProvider(beamsUserId)
              );
            } else {
              console.warn("Browser notification permission denied by user.");
              // Optionally inform the user they won't get system notifications
              throw new Error("Permission denied"); // Stop the promise chain
            }
          })
          // If authentication succeeds, subscribe to the interest
          .then(() => {
            console.log("Beams user authenticated successfully.");
            return beamsClientRef.current.addDeviceInterest("new-orders");
          })
          .then(() => {
            console.log(
              "Successfully subscribed device to 'new-orders' interest."
            );
          })
          .catch((error) => {
            // Log errors unless it's just the permission denial we already handled
            if (error.message !== "Permission denied") {
              console.error(
                "Pusher Beams initialization/subscription error:",
                error
              );
            }
            // Common errors: Service worker registration failed, backend auth endpoint failed, network issues.
            // Consider showing an error message to the admin here.
          });
      } else {
        console.warn(
          "Pusher Beams Instance ID (VITE_PUSHER_BEAMS_INSTANCE_ID) not configured in .env file. Push notifications are disabled."
        );
      }
    } // End if(user)

    // --- Cleanup Function ---
    // This runs when the component unmounts OR when the `user` state changes (before the effect runs again)
    return () => {
      // Cleanup Pusher Channels client
      if (pusherChannelsClient) {
        console.log("Disconnecting Pusher Channels client.");
        pusherChannelsClient.unsubscribe("orders-channel");
        pusherChannelsClient.disconnect();
      }

      // Cleanup Pusher Beams client
      // Check the ref to see if a client instance exists
      if (beamsClientRef.current) {
        console.log(
          "Stopping Pusher Beams client (clears user state and interests)."
        );
        // Use stop() - it handles clearing user ID and unsubscribing interests
        beamsClientRef.current
          .stop()
          .then(() => console.log("Beams client stopped successfully."))
          .catch((e) => console.error("Error stopping Beams client:", e));
        beamsClientRef.current = null; // Clear the ref after stopping
      }
    };
  }, [user]); // Dependency array: Re-run this effect only when the `user` object changes
  // --- END OF MODIFIED EFFECT ---

  const handleLogin = (userData) => {
    localStorage.setItem("ama_user", JSON.stringify(userData));
    setUser(userData);
    setActiveTab("dashboard"); // Go to dashboard after login
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setUser(null);
    setNotification(null); // Clear notification on logout
  };

  // Pass user data and logout handler to the Account component
  const tabs = {
    dashboard: <Dashboard />,
    orders: <Orders />,
    camps: <Camps />,
    statistics: <Statistics />,
    control: <ControlPanel />,
    account: <Account user={user} onLogout={handleLogout} />,
  };

  return (
    <div className="wrap">
      {/* Render the notification if it exists */}
      {notification && (
        <ToastNotification
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Header />
          <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main>{tabs[activeTab]}</main>
        </>
      )}
    </div>
  );
}
