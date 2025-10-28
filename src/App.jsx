// src/App.jsx

import { useState, useEffect } from "react";
import Pusher from "pusher-js"; // Import Pusher
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

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null); // State for notification

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
    }
  }, []);

  // --- NEW: Pusher Effect ---
  // Initialize Pusher when the user logs in
  useEffect(() => {
    if (user) {
      const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
      const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

      if (!pusherKey || !pusherCluster) {
        console.warn(
          "Pusher keys not configured in .env file. Live notifications are disabled."
        );
        return;
      }

      const pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
      });

      // Subscribe to the channel defined in ama-laundry-final.php
      const channel = pusher.subscribe("orders-channel");

      // Bind to the event defined in ama-laundry-final.php
      channel.bind("new-order", (data) => {
        console.log("Pusher: New Order Received", data);
        // Set the notification message
        // setNotification(
        //   `${data.message} (Customer: ${data.customer || "N/A"})`
        // );
        setNotification(data.message);
      });

      // Cleanup on component unmount or user logout
      return () => {
        channel.unbind_all();
        pusher.unsubscribe("orders-channel");
        pusher.disconnect();
      };
    }
  }, [user]); // This effect depends on the user state

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
