const API_BASE = "https://amalaundry.com.au/wp-json/wp/v2";

function getToken() {
  const token = localStorage.getItem("jwt");
  if (!token) {
    console.warn("JWT token missing");
  }
  return token;
}

// Helper function to fetch all items of a certain type
async function fetchAll(type) {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/${type}?per_page=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${type}:`, err);
    return [];
  }
}

export async function fetchLaundryOrders() {
  const [orders, services, pickupSlots, camps] = await Promise.all([
    fetchAll("laundry_order"),
    fetchAll("service"),
    fetchAll("pickup_slot"),
    fetchAll("camp"),
  ]);

  if (!Array.isArray(orders)) {
    console.error("Fetched orders data is not an array:", orders);
    return [];
  }

  // Create maps for quick lookups
  const servicesMap = new Map(services.map((s) => [s.id, s]));
  const pickupSlotsMap = new Map(pickupSlots.map((s) => [s.id, s]));
  const campsMap = new Map(
    camps.map((c) => [c.id, c.title?.rendered || "Unknown Camp"])
  );

  return orders.map((order) => {
    const acf = order.acf || {};
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

    // FIX: Handle camp_name being a single ID or an array of IDs
    const campId = Array.isArray(acf.camp_name)
      ? acf.camp_name[0]
      : acf.camp_name;
    const campName = campsMap.get(campId) || "—";

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
      camp_name: campName,
      services: fetchedServices,
      pickup_slot: slot,
    };
  });
}

export async function updateOrderStatus(orderId, status) {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication token missing");
  }

  try {
    const response = await fetch(`${API_BASE}/update_order_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_status: status,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Update failed:", response.status, errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}
