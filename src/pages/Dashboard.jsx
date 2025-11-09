import Card from "../components/Card";
import { useEffect, useState } from "react";
import { fetchLaundryOrders } from "../api/bookings";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = () => {
    setLoading(true);
    fetchLaundryOrders()
      .then((data) => {
        setOrders(data);
        setLoading(false);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Improved date parsing that handles various formats
  const parseOrderDate = (dateString) => {
    if (!dateString || dateString === "—") return null;

    try {
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

      // Handle ISO format: "2025-09-16T21:31:36"
      if (dateString.includes("T") && dateString.includes("-")) {
        return new Date(dateString);
      }

      // Handle other formats or return null
      console.warn("Unknown date format:", dateString);
      return null;
    } catch (error) {
      console.warn("Failed to parse date:", dateString, error);
      return null;
    }
  };

  // Get today's date for comparison
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Simple string-based approach as fallback
  const todayFormatted = `${todayDay.toString().padStart(2, "0")}/${(
    todayMonth + 1
  )
    .toString()
    .padStart(2, "0")}/${todayYear}`;

  const todaysOrders = orders.filter((order) => {
    if (!order.order_timestamp || order.order_timestamp === "—") return false;

    // Method 1: Try parsing the date
    const orderDate = parseOrderDate(order.order_timestamp);
    if (orderDate) {
      return (
        orderDate.getDate() === todayDay &&
        orderDate.getMonth() === todayMonth &&
        orderDate.getFullYear() === todayYear
      );
    }

    // Method 2: Fallback to string matching
    return order.order_timestamp.includes(todayFormatted);
  });

  // Debug: Log what's being filtered
  useEffect(() => {
    if (orders.length > 0) {
      console.log("=== DATE DEBUGGING ===");
      console.log("Today formatted:", todayFormatted);
      console.log("Total orders:", orders.length);

      orders.forEach((order, index) => {
        const isToday =
          order.order_timestamp &&
          order.order_timestamp.includes(todayFormatted);
        console.log(
          `Order ${index}:`,
          order.order_timestamp,
          "-> Today?",
          isToday
        );
      });

      console.log("Orders filtered as today:", todaysOrders.length);
      console.log(
        "Today orders details:",
        todaysOrders.map((o) => ({
          id: o.id,
          timestamp: o.order_timestamp,
          customer: o.customer_name,
        }))
      );
    }
  }, [orders, todayFormatted]);

  const pendingOrders = orders.filter(
    (order) => order.order_status !== "completed"
  );

  const completedOrdersToday = todaysOrders.filter(
    (order) => order.order_status === "completed"
  );

  const estimatedRevenueToday = completedOrdersToday.reduce((sum, order) => {
    return sum + parseFloat(order.total_price || 0);
  }, 0);

  const activeCustomersToday = [
    ...new Set(
      todaysOrders
        .map((order) => order.customer_name)
        .filter((name) => name && name !== "—")
    ),
  ].length;

  if (loading) {
    return (
      <Card title="Dashboard Overview">
        <p>Loading...</p>
      </Card>
    );
  }

  return (
    <>
      <Card title="Dashboard Overview">
        {/* MODIFIED: Replaced inline style with responsive Tailwind classes */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p>
            Welcome back, Admin! Here's a quick summary of today's activity.
          </p>
          {/* MODIFIED: Replaced inline style with responsive Tailwind classes */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* MODIFIED: Replaced inline style with btn-edit class and responsive width */}
            <button
              onClick={refreshData}
              className="btn-edit w-full sm:w-auto text-sm py-2 px-4"
            >
              Refresh
            </button>
            {/* MODIFIED: Replaced inline style with Tailwind classes */}
            <small className="text-slate-600 text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </small>
          </div>
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card title="Today's Orders">
          <p className="dashboard-metric">{todaysOrders.length}</p>
          <small>Total orders today</small>
        </Card>

        <Card title="Pending Orders">
          <p className="dashboard-metric">{pendingOrders.length}</p>
          <small>Across all dates</small>
        </Card>

        <Card title="Completed Orders Today">
          <p className="dashboard-metric">{completedOrdersToday.length}</p>
          <small>Completed today</small>
        </Card>

        <Card title="Estimated Revenue (Today)">
          <p className="dashboard-metric">
            ${estimatedRevenueToday.toFixed(2)}
          </p>
          <small>From completed orders</small>
        </Card>

        <Card title="Active Customers Today">
          <p className="dashboard-metric">{activeCustomersToday}</p>
          <small>Unique customers today</small>
        </Card>
      </div>
    </>
  );
}
