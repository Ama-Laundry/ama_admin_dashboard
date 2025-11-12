// src/components/Notification.jsx

import { useEffect } from "react";

// +++ MODIFICATION: Accept 'onClick' prop +++
export default function ToastNotification({ message, onClose, onClick }) {
  useEffect(() => {
    // Automatically close the notification after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    // Clear the timer if the component is unmounted or closed manually
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    // +++ MODIFICATION: Add onClick handler and pointer cursor +++
    <div
      className="notification-toast"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="notification-content">
        <strong>🔔 New Order!</strong>
        <p>{message}</p>
        {/* +++ NEW: Add a call to action +++ */}
        <p style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>
          Click to view
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent click from triggering navigation
          onClose();
        }}
        className="notification-close"
      >
        &times;
      </button>
    </div>
  );
}
