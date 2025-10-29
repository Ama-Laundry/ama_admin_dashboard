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

// FIXED Beams Token Provider - uses GET with properly constructed URL
const beamsTokenProvider = (userId) => {
  const beamsAuthEndpoint = `${import.meta.env.VITE_API_BASE_URL}/ama/v1/beams-auth`;
  const nonce = localStorage.getItem("wpNonce");

  // Properly construct URL with URL API to avoid duplicate parameters
  const url = new URL(beamsAuthEndpoint);
  url.searchParams.append('user_id', userId);

  return new PusherPushNotifications.TokenProvider({
    url: url.toString(),
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": nonce || "",
    },
    withCredentials: true,
  });
};

// Debug function to test Beams authentication
const debugBeamsAuth = async (userId) => {
  const beamsAuthEndpoint = `${import.meta.env.VITE_API_BASE_URL}/ama/v1/beams-auth`;
  const nonce = localStorage.getItem("wpNonce");
  
  const url = new URL(beamsAuthEndpoint);
  url.searchParams.append('user_id', userId);

  try {
    console.log('🔧 Debug Beams Auth - Making request to:', url.toString());
    console.log('🔧 Debug Beams Auth - Nonce:', nonce ? 'Present' : 'Missing');
    console.log('🔧 Debug Beams Auth - User ID:', userId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce || '',
      },
      credentials: 'include',
    });

    console.log('🔧 Debug Beams Auth - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔧 Debug Beams Auth - Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('🔧 Debug Beams Auth - Success:', data);
    return data;
  } catch (error) {
    console.error('🔧 Debug Beams Auth - Failed:', error);
    throw error;
  }
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
          enabledTransports: ['ws', 'wss'], // Explicitly enable WebSocket transport
          disabledTransports: ['sockjs', 'xhr_streaming', 'xhr_polling'] // Disable problematic transports
        });
        
        // Add connection state monitoring
        pusherChannelsRef.current.connection.bind('state_change', (states) => {
          console.log('Pusher Channels state change:', states);
        });
        
        pusherChannelsRef.current.connection.bind('error', (error) => {
          console.error('Pusher Channels connection error:', error);
        });

        const channel = pusherChannelsRef.current.subscribe("orders-channel");
        
        channel.bind('pusher:subscription_succeeded', () => {
          console.log('Pusher Channels subscription succeeded');
        });
        
        channel.bind('pusher:subscription_error', (error) => {
          console.error('Pusher Channels subscription error:', error);
        });
        
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

        const beamsUserId = `admin_${user.id}`;
        
        // Debug authentication first
        debugBeamsAuth(beamsUserId)
          .then(() => {
            // If debug succeeds, proceed with normal Beams setup
            return beamsClientRef.current.start();
          })
          .then(() => {
            console.log("Pusher Beams client started successfully.");
            return Notification.requestPermission();
          })
          .then((permission) => {
            if (permission === "granted") {
              console.log("Browser notification permission granted.");
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
              
              // Additional debug info
              console.log('Current user:', user);
              console.log('Beams Instance ID:', beamsInstanceId);
              console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
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
