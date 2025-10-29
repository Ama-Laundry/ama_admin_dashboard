// src/App.jsx
import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
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
import ToastNotification from "./components/Notification";
import { logoutAdmin } from "./api/auth";

// FIXED Beams Token Provider - uses GET with query parameters
const beamsTokenProvider = (userId) => {
  const beamsAuthEndpoint = `${import.meta.env.VITE_API_BASE_URL}/ama/v1/beams-auth`;
  const nonce = localStorage.getItem("wpNonce");

  // Use GET request with user_id as query parameter
  const urlWithParams = `${beamsAuthEndpoint}?user_id=${encodeURIComponent(userId)}`;

  return new PusherPushNotifications.TokenProvider({
    url: urlWithParams,
    method: "GET", // Changed to GET
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": nonce || "",
    },
    withCredentials: true,
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const beamsClientRef = useRef(null);
  const pusherChannelsRef = useRef(null);

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
      setUser(null);
    }
  }, []);

  // Combined Pusher Channels & Beams Initialization/Cleanup
  useEffect(() => {
    // Only initialize if a user is logged in
    if (user) {
      console.log("Initializing Pusher services for user:", user.id);

      // Initialize Pusher Channels
      const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
      const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

      if (pusherKey && pusherCluster) {
        pusherChannelsRef.current = new Pusher(pusherKey, {
          cluster: pusherCluster,
        });
        
        const channel = pusherChannelsRef.current.subscribe("orders-channel");
        channel.bind("new-order", (data) => {
          console.log("Pusher Channels: New Order Received", data);
          setNotification(data.message);
        });
        
        console.log("Pusher Channels initialized successfully");
      } else {
        console.warn("Pusher Channel keys not configured");
      }

      // Initialize Pusher Beams
      const beamsInstanceId = import.meta.env.VITE_PUSHER_BEAMS_INSTANCE_ID;

      if (beamsInstanceId) {
        // Only initialize if the client isn't already stored in the ref
        if (!beamsClientRef.current) {
          beamsClientRef.current = new PusherPushNotifications.Client({
            instanceId: beamsInstanceId,
          });
        }

        // Start the Beams client and authenticate
        beamsClientRef.current
          .start()
          .then(() => {
            console.log("Pusher Beams client started successfully.");
            return Notification.requestPermission();
          })
          .then((permission) => {
            if (permission === "granted") {
              console.log("Browser notification permission granted.");
              const beamsUserId = `admin_${user.id}`;
              console.log(`Authenticating Beams for user: ${beamsUserId}`);
              
              return beamsClientRef.current.setUserId(
                beamsUserId,
                beamsTokenProvider(beamsUserId)
              );
            } else {
              console.warn("Browser notification permission denied by user.");
              throw new Error("Permission denied");
            }
          })
          .then(() => {
            console.log("Beams user authenticated successfully.");
            return beamsClientRef.current.addDeviceInterest("new-orders");
          })
          .then(() => {
            console.log("Successfully subscribed to 'new-orders' interest.");
          })
          .catch((error) => {
            if (error.message !== "Permission denied") {
              console.error("Pusher Beams initialization error:", error);
            }
          });
      } else {
        console.warn("Pusher Beams Instance ID not configured");
      }
    }

    // Cleanup Function
    return () => {
      console.log("Cleaning up Pusher services...");
      
      // Cleanup Pusher Channels
      if (pusherChannelsRef.current) {
        try {
          pusherChannelsRef.current.unsubscribe("orders-channel");
          setTimeout(() => {
            pusherChannelsRef.current.disconnect();
          }, 100);
          console.log("Pusher Channels cleaned up");
        } catch (e) {
          console.error("Error cleaning up Pusher Channels:", e);
        }
      }

      // Cleanup Pusher Beams
      if (beamsClientRef.current) {
        beamsClientRef.current.stop()
          .then(() => console.log("Beams client stopped successfully"))
          .catch((e) => console.error("Error stopping Beams client:", e));
        beamsClientRef.current = null;
      }
    };
  }, [user]);

  const handleLogin = (userData) => {
    localStorage.setItem("ama_user", JSON.stringify(userData));
    setUser(userData);
    setActiveTab("dashboard");
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setNotification(null);
      localStorage.removeItem("ama_user");
    }
  };

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
