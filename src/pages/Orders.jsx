import { useEffect, useState } from "react";
import Card from "../components/Card";
import { fetchLaundryOrders, updateOrderStatus } from "../api/bookings";

// +++ MODIFIED: Updated date parsing function +++
const parseOrderDate = (dateString) => {
  if (!dateString || dateString === "—") return null;

  try {
    // +++ NEW: Handle "YYYY-MM-DD HH:MM:SS" format +++
    // This format is not ISO standard, so new Date() can fail.
    // We must replace the space with a 'T' to make it compatible.
    if (
      dateString.length === 19 &&
      dateString[10] === " " &&
      dateString[4] === "-" &&
      dateString[7] === "-"
    ) {
      const isoDateString = dateString.replace(" ", "T");
      return new Date(isoDateString);
    }

    // Handle Australian format: "17/09/2025, 3:23:27 am"
    if (dateString.includes("/") && dateString.includes(",")) {
      const [datePart, timePart] = dateString.split(", ");
      const [day, month, year] = datePart.split("/");

      // Convert to ISO format: "2025-09-17T03:23:27"
      const timeParts = timePart.split(":");
      let hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const seconds = timeParts[2].split(" ")[0];
      const ampm = timePart.toLowerCase().includes("am") ? "am" : "pm";

      // Convert 12h to 24h format
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;

      const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}T${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
      return new Date(isoDate);
    }

    // Handle full ISO format (which new Date() handles natively)
    // e.g., "2025-11-04T18:13:52.224Z"
    if (dateString.includes("T") && dateString.includes("-")) {
      return new Date(dateString);
    }

    // If no format matches, log it.
    console.warn("Unknown date format:", dateString);
    return null;
  } catch (error) {
    console.warn("Failed to parse date:", dateString, error);
    return null;
  }
};

//
// ++++++++++ START OF MODIFICATION ++++++++++
//

/**
 * Formats a UTC timestamp string (from WordPress) to Perth (AWST) time.
 * Assumes the input "YYYY-MM-DD HH:MM:SS" is in UTC.
 */
const formatUTCToPerth = (utcDateString) => {
  if (!utcDateString || utcDateString === "—") return "—";

  // Check if it matches the "YYYY-MM-DD HH:MM:SS" format from WordPress
  if (
    utcDateString.length === 19 &&
    utcDateString[10] === " " &&
    utcDateString[4] === "-" &&
    utcDateString[7] === "-"
  ) {
    try {
      // Create a UTC date object by replacing the space and appending 'Z'
      // This converts "2025-11-12 16:23:22" -> "2025-11-12T16:23:22Z"
      const isoDateString = utcDateString.replace(" ", "T") + "Z";
      const dateObj = new Date(isoDateString);

      // Define options for Perth (UTC+8)
      const options = {
        timeZone: "Australia/Perth",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // Use 24-hour format to match the original
      };

      // Use 'en-CA' locale to get the YYYY-MM-DD format, then replace the comma
      // This will output "2025-11-13 00:23:22"
      return dateObj.toLocaleString("en-CA", options).replace(",", "");
    } catch (error) {
      console.warn("Failed to format date string:", utcDateString, error);
      return utcDateString; // Return original string on error
    }
  }

  // For any other format (like "17/09/2025..."),
  // return it as-is because we can't be sure of its source timezone.
  return utcDateString;
};

//
// ++++++++++  END OF MODIFICATION  ++++++++++
//

// +++ MODIFICATION: Accept props from App.jsx, including lastOrderTimestamp +++
export default function Orders({
  highlightOrderId,
  setHighlightOrderId,
  lastOrderTimestamp,
}) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("today"); // "today", "all", "completed", "pending", "cancelled"

  // Define the reset state for filters
  const initialFilters = {
    customerName: "all",
    campName: "all",
    roomNumber: "all",
    service: "all",
    paymentStatus: "all",
    pickupMethod: "all",
    minPrice: "",
    maxPrice: "",
  };

  const [filters, setFilters] = useState(initialFilters);
  const [tempFilters, setTempFilters] = useState({ ...filters });

  const uniqueCustomerNames = [
    ...new Set(orders.map((order) => order.customer_name).filter(Boolean)),
  ];
  const uniqueCampNames = [
    ...new Set(orders.map((order) => order.camp_name).filter(Boolean)),
  ];
  const uniqueRoomNumbers = [
    ...new Set(orders.map((order) => order.room_number).filter(Boolean)),
  ];
  const uniqueServices = [
    ...new Set(
      orders
        .flatMap((order) =>
          order.services ? order.services.map((service) => service.name) : []
        )
        .filter(Boolean)
    ),
  ];
  const uniquePickupMethods = [
    ...new Set(orders.map((order) => order.pickup_method).filter(Boolean)),
  ];

  // +++ MODIFICATION: This useEffect now runs on mount AND when lastOrderTimestamp changes +++
  useEffect(() => {
    fetchOrders();
  }, [lastOrderTimestamp]); // This prop change will trigger a re-fetch

  // +++ THIS IS THE NEW HIGHLIGHTING LOGIC +++
  useEffect(() => {
    if (highlightOrderId) {
      // Check if the order is already in the currently filtered list
      const orderInList = filteredOrders.find((o) => o.id === highlightOrderId);

      if (orderInList) {
        // Order is in the list, try to find it in the DOM
        const rowToHighlight = document.querySelector(
          `tr[data-order-id='${highlightOrderId}']`
        );

        if (rowToHighlight) {
          // SUCCESS: Found it! Highlight and set cleanup.
          rowToHighlight.classList.add("highlight-order");
          rowToHighlight.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          const timer = setTimeout(() => {
            rowToHighlight.classList.remove("highlight-order");
            setHighlightOrderId(null); // Clear the ID *only* after success
          }, 3000); // Highlight for 3 seconds

          return () => clearTimeout(timer);
        }
        // If rowToHighlight is null, the DOM hasn't updated yet.
        // We do nothing and let the effect re-run when it does.
      } else {
        // Order is NOT in the list. Force filters to 'all'.
        // This will trigger a re-render and re-run this effect.
        console.log(
          `Order ${highlightOrderId} not found in view, switching to "All Orders".`
        );
        setViewMode("all");
        setFilters(initialFilters);
        setTempFilters(initialFilters);
        setShowFilters(true); // Show user what happened
      }
    }
  }, [highlightOrderId, filteredOrders, setHighlightOrderId, initialFilters]); // Dependencies
  // +++ END OF NEW HIGHLIGHTING LOGIC +++

  const fetchOrders = () => {
    fetchLaundryOrders()
      .then((data) => {
        if (!Array.isArray(data)) {
          setError(true);
        } else {
          console.log(
            "Orders.jsx - Received data:",
            data.map((order) => ({
              id: order.id,
              camp_name: order.camp_name,
            }))
          );
          setOrders(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err);
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    let result = orders;

    // --- 1. Apply dropdown/text filters ---
    if (filters.customerName !== "all") {
      result = result.filter(
        (order) => order.customer_name === filters.customerName
      );
    }
    if (filters.campName !== "all") {
      result = result.filter((order) => order.camp_name === filters.campName);
    }
    if (filters.roomNumber !== "all") {
      result = result.filter(
        (order) => order.room_number.toString() === filters.roomNumber
      );
    }
    if (filters.service !== "all") {
      result = result.filter((order) =>
        order.services?.some((service) => service.name === filters.service)
      );
    }
    if (filters.paymentStatus !== "all") {
      const status = filters.paymentStatus === "confirmed";
      result = result.filter((order) => order.payment_confirmed === status);
    }
    if (filters.pickupMethod !== "all") {
      result = result.filter(
        (order) => order.pickup_method === filters.pickupMethod
      );
    }
    if (filters.minPrice) {
      result = result.filter(
        (order) =>
          parseFloat(order.total_price || 0) >= parseFloat(filters.minPrice)
      );
    }
    if (filters.maxPrice) {
      result = result.filter(
        (order) =>
          parseFloat(order.total_price || 0) <= parseFloat(filters.maxPrice)
      );
    }

    // --- 2. Apply View Mode filter ---
    if (viewMode === "today") {
      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();
      const todayFormatted = `${todayDay.toString().padStart(2, "0")}/${(
        todayMonth + 1
      )
        .toString()
        .padStart(2, "0")}/${todayYear}`;

      result = result.filter((order) => {
        if (!order.order_timestamp || order.order_timestamp === "—")
          return false;

        const orderDate = parseOrderDate(order.order_timestamp);
        if (orderDate) {
          return (
            orderDate.getDate() === todayDay &&
            orderDate.getMonth() === todayMonth &&
            orderDate.getFullYear() === todayYear
          );
        }
        return order.order_timestamp.includes(todayFormatted);
      });
    } else if (viewMode === "completed") {
      result = result.filter((order) => order.order_status === "completed");
    } else if (viewMode === "pending") {
      result = result.filter(
        (order) =>
          order.order_status !== "completed" &&
          order.order_status !== "cancelled"
      );
    } else if (viewMode === "cancelled") {
      result = result.filter((order) => order.order_status === "cancelled");
    }
    // 'all' mode does nothing and shows all filtered results

    setFilteredOrders(result);
  }, [viewMode, filters, orders]); // Re-run whenever mode, filters, or orders change

  const handleStatusToggle = async (orderId, newStatus) => {
    try {
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, order_status: newStatus } : order
      );
      setOrders(updatedOrders);

      try {
        await updateOrderStatus(orderId, newStatus);
        console.log("Order status updated successfully on server");
      } catch (apiError) {
        console.warn("API update failed:", apiError);
        const revertedOrders = orders.map((order) =>
          order.id === orderId
            ? { ...order, order_status: order.order_status } // Revert to original status
            : order
        );
        setOrders(revertedOrders);
        alert("Failed to update order status. Please try again.");
      }
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Failed to update order status. Please try again.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await handleStatusToggle(orderId, "cancelled");
    }
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setTempFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setTempFilters(initialFilters);
    setFilters(initialFilters);
    setViewMode("today"); // Default to today's orders
  };

  const clearAllFilters = () => {
    resetFilters();
    setViewMode("today"); // Default to today's orders
    setShowFilters(false);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  return (
    <Card title="Today's Orders">
      {loading ? (
        <p style={{ color: "black" }}>Loading orders...</p>
      ) : error ? (
        <p style={{ color: "black" }}>
          Error loading orders. Please try again.
        </p>
      ) : (
        <>
          {/* Filter Controls */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "White",
                color: "black",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            {/* Today's Orders Button */}
            <button
              onClick={() => handleViewModeChange("today")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: viewMode === "today" ? "#3b82f6" : "White",
                color: viewMode === "today" ? "white" : "black", // White text when active
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Today's Orders
            </button>

            {/* View Mode Buttons */}
            <button
              onClick={() => handleViewModeChange("all")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: viewMode === "all" ? "#3b82f6" : "White",
                color: viewMode === "all" ? "white" : "black", // White text when active
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              All Orders
            </button>

            <button
              onClick={() => handleViewModeChange("pending")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: viewMode === "pending" ? "#f59e0b" : "White",
                color: viewMode === "pending" ? "white" : "black", // White text when active
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Pending Orders
            </button>

            <button
              onClick={() => handleViewModeChange("completed")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: viewMode === "completed" ? "#10b981" : "White",
                color: viewMode === "completed" ? "white" : "black", // White text when active
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Completed Orders
            </button>

            {/* Cancelled Orders Button */}
            <button
              onClick={() => handleViewModeChange("cancelled")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: viewMode === "cancelled" ? "#ef4444" : "White",
                color: viewMode === "cancelled" ? "white" : "black", // White text when active
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Cancelled Orders
            </button>

            {/* Clear All Filters Button */}
            <button
              onClick={clearAllFilters}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Clear All Filters
            </button>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                borderRadius: "0.5rem",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #e5e7eb",
                color: "black",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "black",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                Filter Orders
                <button
                  onClick={() => setShowFilters(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    fontSize: "1rem",
                    cursor: "pointer",
                    color: "black",
                  }}
                >
                  ✖ Cancel
                </button>
              </h3>

              {/* === Full Filter Inputs === */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                  color: "black",
                }}
              >
                {/* Customer Name */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="customerName" style={{ color: "black" }}>
                    Customer Name
                  </label>
                  <select
                    id="customerName"
                    name="customerName"
                    value={tempFilters.customerName}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Customers</option>
                    {uniqueCustomerNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camp Name */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="campName" style={{ color: "black" }}>
                    Camp Name
                  </label>
                  <select
                    id="campName"
                    name="campName"
                    value={tempFilters.campName}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Camps</option>
                    {uniqueCampNames.map((camp) => (
                      <option key={camp} value={camp}>
                        {camp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Number */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="roomNumber" style={{ color: "black" }}>
                    Room Number
                  </label>
                  <select
                    id="roomNumber"
                    name="roomNumber"
                    value={tempFilters.roomNumber}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Rooms</option>
                    {uniqueRoomNumbers.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="service" style={{ color: "black" }}>
                    Service
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={tempFilters.service}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Services</option>
                    {uniqueServices.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Status */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="paymentStatus" style={{ color: "black" }}>
                    Payment Status
                  </label>
                  <select
                    id="paymentStatus"
                    name="paymentStatus"
                    value={tempFilters.paymentStatus}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="unconfirmed">Unconfirmed</option>
                  </select>
                </div>

                {/* Pickup Method */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="pickupMethod" style={{ color: "black" }}>
                    Pickup Method
                  </label>
                  <select
                    id="pickupMethod"
                    name="pickupMethod"
                    value={tempFilters.pickupMethod}
                    onChange={handleFilterChange}
                    style={{ color: "black" }}
                  >
                    <option value="all">All Methods</option>
                    {uniquePickupMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* *
                 * ++++++++++ START OF MODIFICATION ++++++++++
                 *
                 */}

                {/* Min Price */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="minPrice" style={{ color: "black" }}>
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    id="minPrice"
                    name="minPrice"
                    value={tempFilters.minPrice}
                    onChange={handleFilterChange}
                    placeholder="e.g., 10"
                    style={{ color: "black" }}
                  />
                </div>

                {/* Max Price */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor="maxPrice" style={{ color: "black" }}>
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    id="maxPrice"
                    name="maxPrice"
                    value={tempFilters.maxPrice}
                    onChange={handleFilterChange}
                    placeholder="e.g., 50"
                    style={{ color: "black" }}
                  />
                </div>
                {/* *
                 * ++++++++++  END OF MODIFICATION  ++++++++++
                 *
                 */}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "black",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={applyFilters}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                    }}
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
                <span>
                  Showing {filteredOrders.length} of {orders.length} orders
                </span>
              </div>
            </div>
          )}

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <p style={{ color: "black" }}>No orders match your filters.</p>
          ) : (
            <div className="orders-table-container" style={{ color: "black" }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {/* +++ MODIFIED: Header text changed +++ */}
                    <th>Receipt #</th>
                    <th>Timestamp</th>
                    <th>Customer Name</th>
                    <th>Camp Name</th>
                    <th>Room</th>
                    <th>Service</th>
                    <th>Total Price</th>
                    <th>Pickup</th>
                    <th>Pickup Slot</th>
                    <th>Instructions</th>
                    <th>Order Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    // +++ MODIFICATION: Add data-order-id attribute +++
                    <tr key={order.id} data-order-id={order.id}>
                      <td data-label="#">{index + 1}</td>
                      {/* +++ MODIFIED: Data label and content changed +++ */}
                      <td data-label="Receipt #">
                        {order.receipt_number || order.id}
                      </td>

                      {/*
                        // ++++++++++ START OF MODIFICATION ++++++++++
                      */}
                      <td data-label="Timestamp">
                        {/* Use the new formatter function here */}
                        {formatUTCToPerth(order.order_timestamp)}
                      </td>
                      {/*
                        // ++++++++++  END OF MODIFICATION  ++++++++++
                      */}

                      <td data-label="Customer Name">
                        {order.customer_name || "—"}
                      </td>
                      <td data-label="Camp Name">{order.camp_name || "—"}</td>
                      <td data-label="Room">{order.room_number}</td>
                      <td data-label="Service">
                        {order.services?.length > 0 ? (
                          <ol>
                            {order.services.map((service) => (
                              <li key={service.id}>{service.name}</li>
                            ))}
                          </ol>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Total Price">
                        ${parseFloat(order.total_price || 0).toFixed(2)} AUD
                      </td>
                      <td data-label="Pickup">{order.pickup_method}</td>
                      <td data-label="Pickup Slot">
                        {order.pickup_slot?.acf?.time || "—"}
                      </td>
                      <td data-label="Instructions">
                        {order.special_instructions || "—"}
                      </td>
                      <td data-label="Order Status">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {order.order_status !== "cancelled" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusToggle(
                                    order.id,
                                    order.order_status === "completed"
                                      ? "pending"
                                      : "completed"
                                  )
                                }
                                style={{
                                  backgroundColor:
                                    order.order_status === "completed"
                                      ? "#10b981"
                                      : "#f59e0b",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "30px",
                                  height: "30px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "16px",
                                }}
                                title={
                                  order.order_status === "completed"
                                    ? "Mark as pending"
                                    : "Mark as completed"
                                }
                              >
                                {order.order_status === "completed" ? "✓" : "?"}
                              </button>

                              {/* +++ MODIFICATION: Only show cancel button if order is NOT completed +++ */}
                              {order.order_status !== "completed" && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  style={{
                                    backgroundColor: "#ef4444",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "30px",
                                    height: "30px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "16px",
                                  }}
                                  title="Cancel order"
                                >
                                  ✕
                                </button>
                              )}
                              {/* +++ END MODIFICATION +++ */}
                            </>
                          )}

                          <span style={{ marginLeft: "4px" }}>
                            {order.order_status === "completed"
                              ? "Completed"
                              : order.order_status === "cancelled"
                              ? "Cancelled"
                              : "Pending"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
