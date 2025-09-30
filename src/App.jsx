// src/App.jsx

import { useState, useEffect } from "react";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Camps from "./pages/Camps";
import Statistics from "./pages/Statistics";
import ControlPanel from "./pages/ControlPanel";
import Account from "./pages/Account";
import Login from "./pages/Login";
import { logoutAdmin } from "./api/auth";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);

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

  const handleLogin = (userData) => {
    localStorage.setItem("ama_user", JSON.stringify(userData));
    setUser(userData);
    setActiveTab("dashboard"); // Go to dashboard after login
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setUser(null);
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
