import Card from "../components/Card";
import { useEffect, useState } from "react";
import { fetchLaundryOrders } from "../api/bookings";

export default function Statistics() {
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
        console.error("Failed to fetch statistics data:", err);
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

  const totalOrders = orders.length;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Simple string-based approach as fallback for month filtering
  const currentMonthFormatted = (currentMonth + 1).toString().padStart(2, "0");
  const currentYearFormatted = currentYear.toString();

  const ordersThisMonth = orders.filter((order) => {
    if (!order.order_timestamp || order.order_timestamp === "—") return false;

    // Method 1: Try parsing the date
    const orderDate = parseOrderDate(order.order_timestamp);
    if (orderDate) {
      return (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      );
    }

    // Method 2: Fallback to string matching for month/year
    // Look for patterns like "/09/2025" (month/year)
    const monthYearPattern = `/${currentMonthFormatted}/${currentYearFormatted}`;
    return order.order_timestamp.includes(monthYearPattern);
  });

  // Count cancelled orders for this month
  const cancelledOrdersThisMonth = ordersThisMonth.filter(
    (order) => order.order_status === "cancelled"
  ).length;

  const revenueThisMonth = ordersThisMonth.reduce((sum, order) => {
    // Only count revenue from non-cancelled orders
    if (order.order_status !== "cancelled") {
      return sum + parseFloat(order.total_price || 0);
    }
    return sum;
  }, 0);

  const averageOrderValue =
    totalOrders > 0
      ? orders.reduce((sum, order) => {
          // Only include non-cancelled orders in AOV calculation
          if (order.order_status !== "cancelled") {
            return sum + parseFloat(order.total_price || 0);
          }
          return sum;
        }, 0) /
        orders.filter((order) => order.order_status !== "cancelled").length
      : 0;

  // Only count non-cancelled orders for service popularity
  const nonCancelledOrders = orders.filter(
    (order) => order.order_status !== "cancelled"
  );

  const serviceCounts = nonCancelledOrders
    .flatMap((order) => order.services || [])
    .reduce((acc, service) => {
      if (service && service.name) {
        acc[service.name] = (acc[service.name] || 0) + 1;
      }
      return acc;
    }, {});

  const mostPopularService =
    Object.keys(serviceCounts).length > 0
      ? Object.keys(serviceCounts).reduce(
          (a, b) => (serviceCounts[a] > serviceCounts[b] ? a : b),
          Object.keys(serviceCounts)[0]
        )
      : "No data";

  const mostPopularServiceCount = serviceCounts[mostPopularService] || 0;

  // Additional statistics
  const completedOrders = orders.filter(
    (order) => order.order_status === "completed"
  ).length;
  const pendingOrders = orders.filter(
    (order) =>
      order.order_status !== "completed" && order.order_status !== "cancelled"
  ).length;
  const totalCancelledOrders = orders.filter(
    (order) => order.order_status === "cancelled"
  ).length;

  // Total revenue from all non-cancelled orders
  const totalRevenue = orders.reduce((sum, order) => {
    if (order.order_status !== "cancelled") {
      return sum + parseFloat(order.total_price || 0);
    }
    return sum;
  }, 0);

  // Debug: Log what's being filtered
  useEffect(() => {
    if (orders.length > 0) {
      console.log("=== STATISTICS DEBUGGING ===");
      console.log("Total orders:", orders.length);
      console.log("Completed orders:", completedOrders);
      console.log("Pending orders:", pendingOrders);
      console.log("Cancelled orders:", totalCancelledOrders);
      console.log("Cancelled this month:", cancelledOrdersThisMonth);
      console.log("Total revenue:", totalRevenue);
    }
  }, [orders]);

  if (loading) {
    return (
      <div className="statistics-grid">
        <Card title="Loading Statistics">
          <p className="statistics-metric">Loading...</p>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Total Orders (All Time)", value: totalOrders },
    { label: "Completed Orders", value: completedOrders },
    { label: "Pending Orders", value: pendingOrders },
    { label: "Cancelled Orders (All Time)", value: totalCancelledOrders },
    { label: "Revenue This Month", value: `$${revenueThisMonth.toFixed(2)}` },
    { label: "Total Revenue (All Time)", value: `$${totalRevenue.toFixed(2)}` },
    { label: "Orders This Month", value: ordersThisMonth.length },
    {
      label: "Average Order Value (AOV)",
      value: `$${averageOrderValue.toFixed(2)}`,
    },
    {
      label: "Most Popular Service",
      value: `${mostPopularService} (${mostPopularServiceCount} orders)`,
    },
    { label: "Cancelled Orders (This Month)", value: cancelledOrdersThisMonth },
  ];

  return (
    <div>
      <Card title="Statistics Overview">
        {/* MODIFIED: Replaced inline style with responsive Tailwind classes */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p>Comprehensive order statistics and analytics</p>
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
        {stats.map((stat, index) => (
          <Card key={index} title={stat.label}>
            <p className="dashboard-metric">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
