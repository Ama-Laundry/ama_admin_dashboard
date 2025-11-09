import React, { useEffect, useState, useMemo } from "react";
import { getBookings, updateBookingStatus } from "../api/bookings";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getBookings();
        // Sort by descending order ID by default
        const sortedData = data.sort((a, b) => b.id - a.id);
        setOrders(sortedData);
        setError(null);
      } catch (err) {
        setError("Failed to fetch orders. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateBookingStatus(orderId, newStatus);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, acf: { ...order.acf, status: newStatus } }
            : order
        )
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      // Optionally, show an error message to the user
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchTerm = filter.toLowerCase();
      const matchesSearch =
        order.id.toString().includes(searchTerm) ||
        (order.acf.customer_name &&
          order.acf.customer_name.toLowerCase().includes(searchTerm)) ||
        (order.acf.customer_phone &&
          order.acf.customer_phone.toLowerCase().includes(searchTerm)) ||
        (order.acf.customer_email &&
          order.acf.customer_email.toLowerCase().includes(searchTerm));

      const matchesStatus =
        statusFilter === "all" ||
        (order.acf.status || "pending") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, filter, statusFilter]);

  if (loading) {
    return <div className="text-center p-8">Loading orders...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Orders
      </h1>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search by ID, name, phone, or email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 border rounded w-1/3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Order ID
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Date & Time
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Customer
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Service
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Camp
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Pickup Address
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Pickup Slot
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Total Price
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Payment Method
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.id}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.order_timestamp
                    ? new Date(order.acf.order_timestamp).toLocaleString()
                    : "N/A"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-medium">{order.acf.customer_name}</div>
                  <div>{order.acf.customer_phone}</div>
                  <div>{order.acf.customer_email}</div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.service}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.camp}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.pickup_address}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.pickup_slot}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  ${order.acf.total_price}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  {order.acf.payment_method}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                  <select
                    value={order.acf.status || "pending"}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                    className="p-1 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
