// src/api/bookings.js
// +++ MODIFIED: Import the fixed helpers +++
import { apiRequest, customApiRequest } from "./controlPanel";

// --- All local helper functions (getCookie, apiRequest) are REMOVED ---

// Helper function to fetch all items of a certain type
async function fetchAll(type) {
  try {
    // Use the robust apiRequest function for the GET request
    const data = await apiRequest(`${type}?per_page=100`);
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${type}:`, err.message);
    return []; // Return an empty array on failure
  }
}

export async function fetchLaundryOrders() {
  try {
    const [orders, services, pickupSlots, camps] = await Promise.all([
      fetchAll("laundry_order"),
      fetchAll("service"),
      fetchAll("pickup_slot"),
      // fetchAll("camp"),
    ]);

    if (!Array.isArray(orders)) {
      console.error("Fetched orders data is not an array:", orders);
      return [];
    }

    const servicesMap = new Map(services.map((s) => [s.id, s]));
    const pickupSlotsMap = new Map(pickupSlots.map((s) => [s.id, s]));
    // const campsMap = new Map(
    //   camps.map((c) => [c.id, c.title?.rendered || "Unknown Camp"])
    // );

    // // DEBUG: Verify campsMap has the expected data
    // console.log("CampsMap entries:", Array.from(campsMap.entries()));

    const processedOrders = orders.map((order) => {
      const acf = order.acf || {};

      // console.log(
      //   `Order ${order.id} camp_name field:`,
      //   acf.camp_name,
      //   typeof acf.camp_name
      // );

      // // SIMPLIFIED CAMP NAME RESOLUTION
      // let campName = "—";
      // if (acf.camp_name) {
      //   const campId = parseInt(acf.camp_name);
      //   console.log(
      //     `Looking up camp ID ${campId} in campsMap, exists:`,
      //     campsMap.has(campId)
      //   );

      //   if (!isNaN(campId) && campsMap.has(campId)) {
      //     campName = campsMap.get(campId);
      //     console.log(`Found camp name: ${campName}`);
      //   }
      // }
      // Directly read the camp name text string from the JSON
      const campName = acf.camp_name || "—";

      const serviceIds = Array.isArray(acf.service_id)
        ? acf.service_id
        : [acf.service_id].filter(Boolean);

      const fetchedServices = serviceIds
        .map((id) => servicesMap.get(id))
        .filter(Boolean)
        .map((service) => ({
          id: service.id,
          name: service.title?.rendered || "",
          slug: service.acf?.slug || "",
          price: service.acf?.price || "",
        }));

      const slot = pickupSlotsMap.get(acf.slot_id);

      // RETURN THE ORDER OBJECT WITH CAMP NAME
      return {
        id: order.id,
        title: order.title?.rendered || "",
        customer_name: acf.customer_name || "—",
        room_number: acf.room_number || "—",
        pickup_method: acf.pickup_method || "—",
        payment_confirmed: acf.payment_confirmed || false,
        total_price: acf.total_price || "0.00",
        special_instructions: acf.Special_Instructions || "—",
        order_status: acf.order_status || "pending",
        order_timestamp: acf.order_timestamp || "—",
        camp_name: campName, // This should be properly set
        services: fetchedServices,
        pickup_slot: slot,
        date_created: order.date || order.date_created || order.modified,
      };
    });

    // DEBUG: Check the final processed orders
    console.log(
      "Processed orders with camp names:",
      processedOrders.map((o) => ({
        id: o.id,
        camp_name: o.camp_name,
      }))
    );

    return processedOrders;
  } catch (error) {
    console.error("Error fetching laundry orders:", error);
    throw new Error("Failed to load orders. Please check your authentication.");
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    // +++ MODIFIED: Use the imported helper +++
    return await customApiRequest(`orders/${orderId}`, "PUT", {
      acf: { order_status: status },
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

// Additional utility functions
export const verifyAuth = async () => {
  try {
    const response = await fetchAll("service?per_page=1");
    return { authenticated: true };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
};

export async function logoutUser() {
  try {
    // +++ MODIFIED: Use the imported helper +++
    await customApiRequest("logout", "POST");
  } catch (error) {
    console.error("Logout API call failed:", error);
  } finally {
    // Always clear local storage
    localStorage.removeItem("wpNonce");
    localStorage.removeItem("ama_user");
  }
}
