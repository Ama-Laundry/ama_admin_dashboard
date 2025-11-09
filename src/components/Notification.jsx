// src/components/Notification.jsx

import { useEffect } from "react";

export default function ToastNotification({ message, onClose }) {
  useEffect(() => {
    // Automatically close the notification after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    // Clear the timer if the component is unmounted or closed manually
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="notification-toast">
      <div className="notification-content">
        <strong>🔔 New Order!</strong>
        <p>{message}</p>
      </div>
      <button onClick={onClose} className="notification-close">
        &times;
      </button>
    </div>
  );
}
