import { useState, useEffect } from "react";
import {
  TrashIcon,
  PhotoIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Card from "../components/Card";
import TimePicker from "../components/TimePicker";
import PaymentMethods from "../components/PaymentMethods";
import {
  getSettings,
  updateSettings,
  createPickupSlot,
  deletePickupSlot,
  updateServicePrice,
  // +++ IMPORT THE NEW FUNCTION +++
  updateServiceName,
  getServices,
  updateServiceImage,
  deleteServiceImage,
} from "../api/controlPanel";

// Helper function (remains the same)
const convertTo24Hour = (time12h) => {
  if (!time12h) return "";
  const [time, period] = time12h.split(" ");
  let [hours, minutes, seconds] = time.split(":");
  hours = parseInt(hours, 10);

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
};

export default function ControlPanel() {
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [pickupSlots, setPickupSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [dailyAvailability, setDailyAvailability] = useState(true);
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingServiceId, setUploadingServiceId] = useState(null);

  // --- MODIFIED STATE ---
  const [showSuccess, setShowSuccess] = useState(false); // Renamed from uploadSuccess
  const [successMessage, setSuccessMessage] = useState("");
  // --- END MODIFIED STATE ---

  const [recentlyUploaded, setRecentlyUploaded] = useState({});
  const [imageVersion, setImageVersion] = useState({});

  // State for managing the TimePicker modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({
    target: null,
    initialValue: "",
  });

  // +++ NEW HELPER FUNCTION +++
  // Helper function to show a success message
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setError(""); // Clear any previous errors
  };
  // +++ END NEW HELPER FUNCTION +++

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError("");
      try {
        const [settings, servicesData] = await Promise.all([
          getSettings(),
          getServices(),
        ]);

        setPrices(settings.prices);
        setPickupSlots(settings.pickupSlots);
        setDailyAvailability(settings.dailyAvailability);

        // Initialize image version for each service
        const initialImageVersion = {};
        servicesData.forEach((service) => {
          initialImageVersion[service.id] = Date.now();
        });
        setImageVersion(initialImageVersion);

        setServices(servicesData);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setError("Failed to load settings. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // --- MODIFIED USEEFFECT ---
  // Clear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      // <-- CHANGED
      const timer = setTimeout(() => {
        setShowSuccess(false); // <-- CHANGED
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]); // <-- CHANGED
  // --- END MODIFIED USEEFFECT ---

  // Clear recently uploaded indicator after 5 seconds
  useEffect(() => {
    if (Object.keys(recentlyUploaded).length > 0) {
      const timer = setTimeout(() => {
        setRecentlyUploaded({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUploaded]);

  // +++ NEW: HANDLER FOR NAME CHANGE (UPDATES BOTH STATE ARRAYS) +++
  const handleNameChange = (id, newName) => {
    // Update the 'prices' state array
    const updatedPrices = prices.map((item) =>
      item.id === id ? { ...item, name: newName } : item
    );
    setPrices(updatedPrices);

    // Update the 'services' state array (for the Service Images card)
    const updatedServices = services.map((item) =>
      item.id === id ? { ...item, name: newName } : item
    );
    setServices(updatedServices);
  };

  // +++ NEW: HANDLER FOR NAME UPDATE API CALL (ON BLUR) +++
  // --- MODIFIED: Added success message ---
  const handleNameUpdateOnBlur = (id, name) => {
    if (!name.trim()) {
      setError("Service name cannot be empty.");
      // Note: This doesn't revert the state, you might want to reload data
      return;
    }
    updateServiceName(id, name)
      .then(() => {
        // <-- ADDED
        showSuccessMessage("Service name updated successfully.");
      })
      .catch((err) => {
        console.error("Failed to update name:", err);
        setError(
          "Failed to update service name. Check connection and try again."
        );
      });
  };

  const handlePriceChange = (id, newPrice) => {
    const updatedPrices = prices.map((item) =>
      item.id === id ? { ...item, price: parseFloat(newPrice) || 0 } : item
    );
    setPrices(updatedPrices);
  };

  // --- MODIFIED: Added success message ---
  const handlePriceUpdateOnBlur = (id, price) => {
    updateServicePrice(id, price)
      .then(() => {
        // <-- ADDED
        showSuccessMessage("Service price updated successfully.");
      })
      .catch((err) => {
        console.error("Failed to update price:", err);
        setError("Failed to update price. Check connection and try again.");
      });
  };

  // --- MODIFIED: Added success message ---
  const handleAddSlot = async () => {
    if (!newSlotStart) {
      setError("Please select a start time.");
      return;
    }
    setError("");
    try {
      const startTime24 = convertTo24Hour(newSlotStart);
      const newSlotValue = startTime24;

      const addedSlot = await createPickupSlot(newSlotValue);
      const newSlotForState = { id: addedSlot.id, time: addedSlot.acf.time };
      setPickupSlots([...pickupSlots, newSlotForState]);
      setNewSlotStart("");
      showSuccessMessage("Pickup slot added successfully."); // <-- ADDED
    } catch (err) {
      setError(err.message);
    }
  };

  // --- MODIFIED: Added success message ---
  const handleDeleteSlot = async (id) => {
    try {
      await deletePickupSlot(id);
      setPickupSlots(pickupSlots.filter((slot) => slot.id !== id));
      showSuccessMessage("Pickup slot deleted successfully."); // <-- ADDED
    } catch (err) {
      setError(err.message);
    }
  };

  // --- MODIFIED: Added success/error message ---
  const handleToggleAvailability = () => {
    const newAvailability = !dailyAvailability;
    setDailyAvailability(newAvailability);
    updateSettings({
      daily_availability: newAvailability,
    })
      .then(() => {
        // <-- ADDED
        showSuccessMessage("Availability updated successfully.");
      })
      .catch((err) => {
        // <-- ADDED
        console.error("Failed to update availability:", err);
        setError("Failed to update availability. Please try again.");
        setDailyAvailability(!newAvailability); // Revert state on failure
      });
  };

  // --- MODIFIED: Renamed setUploadSuccess -> setShowSuccess ---
  const handleImageUpload = async (serviceId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      setError("Please select a valid image file (JPEG, PNG, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setUploadingImage(true);
    setUploadingServiceId(serviceId);
    setError("");
    setShowSuccess(false); // <-- CHANGED
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "title",
        `Service Image for ${services.find((s) => s.id === serviceId)?.name}`
      );
      formData.append("status", "publish");

      const updatedService = await updateServiceImage(serviceId, formData);
      const newImageUrl = `${updatedService.image}?v=${Date.now()}`;

      setServices(
        services.map((service) =>
          service.id === serviceId
            ? { ...service, image: newImageUrl }
            : service
        )
      );

      setImageVersion((prev) => ({ ...prev, [serviceId]: Date.now() }));
      setRecentlyUploaded((prev) => ({ ...prev, [serviceId]: true }));
      setShowSuccess(true); // <-- CHANGED
      setSuccessMessage("Image uploaded successfully!");
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      setUploadingServiceId(null);
      event.target.value = "";
    }
  };

  // --- MODIFIED: Renamed setUploadSuccess -> setShowSuccess ---
  const handleImageDelete = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    try {
      await deleteServiceImage(serviceId);
      setServices(
        services.map((service) =>
          service.id === serviceId ? { ...service, image: null } : service
        )
      );
      setImageVersion((prev) => ({ ...prev, [serviceId]: Date.now() }));
      setShowSuccess(true); // <-- CHANGED
      setSuccessMessage("Image deleted successfully!");
    } catch (err) {
      console.error("Failed to delete image:", err);
      setError(err.message || "Failed to delete image. Please try again.");
    }
  };

  const openPicker = (target, initialValue) => {
    setPickerConfig({ target, initialValue });
    setIsPickerOpen(true);
  };

  const handlePickerConfirm = (time) => {
    if (pickerConfig.target === "start") {
      setNewSlotStart(time);
    } else if (pickerConfig.target === "end") {
      setNewSlotEnd(time);
    }
    setIsPickerOpen(false);
  };

  if (loading) {
    return <div className="text-center p-10">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col text-center m-4">
        <h1 className="text-3xl font-bold">Control Panel</h1>
        <p className="sub mt-1 mb-4">
          Manage service availability, pricing, and payment options.
        </p>
      </header>

      {error && (
        <div className="bg-red-900/50 text-red-300 p-4 rounded-lg text-center">
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* --- MODIFIED: Renamed uploadSuccess -> showSuccess --- */}
      {showSuccess && ( // <-- CHANGED
        <div className="bg-green-900/50 text-green-300 p-4 rounded-lg text-center">
          <p>
            <strong>Success:</strong> {successMessage}
          </p>
        </div>
      )}
      {/* --- END MODIFICATION --- */}

      <div className="space-y-8">
        <Card title="Daily Availability">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="flex-1 text-center sm:text-left">
              {dailyAvailability
                ? "Service is available for booking today."
                : "Service is inactive. Users will see a 'Fully booked' message."}
            </p>
            <button
              onClick={handleToggleAvailability}
              className={`w-full sm:w-auto ${
                dailyAvailability ? "btn-danger" : "btn-add"
              }`}
            >
              {dailyAvailability
                ? "Deactivate for Today"
                : "Activate for Today"}
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title="Service Pricing">
            <div className="cp-list">
              {prices.map((item) => (
                <div key={item.id} className="cp-list-item">
                  {/* === MODIFICATION: Replaced span with input === */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleNameChange(item.id, e.target.value)}
                    onBlur={(e) =>
                      handleNameUpdateOnBlur(item.id, e.target.value)
                    }
                    // +++ FIX: Added '!text-black' to force override +++
                    className="item-name form-input !w-auto !text-left !text-black"
                    aria-label={`Name for ${item.name}`}
                  />
                  {/* === END OF MODIFICATION === */}

                  <div className="item-actions">
                    {/* +++ THIS LINE IS NOW REMOVED +++ */}
                    {/* <span className="text-lg text-black mr-1">$</span> */}

                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        handlePriceChange(item.id, e.target.value)
                      }
                      onBlur={(e) =>
                        handlePriceUpdateOnBlur(item.id, e.target.value)
                      }
                      className="cp-input add-item-input"
                      aria-label={`Price for ${item.name}`}
                    />
                    <span className="text-sm font-medium text-black ml-2">
                      AUD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Service Images">
            <div className="cp-list">
              {services.map((service) => (
                <div key={service.id} className="cp-list-item">
                  {/* This span will now update automatically */}
                  <span className="item-name">{service.name}</span>
                  <div className="item-actions">
                    {service.image ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <img
                            src={`${service.image}${
                              typeof service.image === "string" &&
                              service.image.includes("?")
                                ? "&"
                                : "?"
                            }v=${imageVersion[service.id] || Date.now()}`}
                            alt={service.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          {recentlyUploaded[service.id] && (
                            <CheckCircleIcon className="absolute -top-1 -right-1 h-5 w-5 text-green-500 bg-white rounded-full" />
                          )}
                        </div>
                        <button
                          onClick={() => handleImageDelete(service.id)}
                          className="btn-icon delete"
                          aria-label={`Delete image for ${service.name}`}
                          disabled={uploadingImage}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm mr-2">
                        No image
                      </span>
                    )}
                    <label className="btn-icon cursor-pointer">
                      {uploadingImage && uploadingServiceId === service.id ? (
                        <div className="flex items-center">
                          <div className="h-5 w-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-1"></div>
                          <span className="text-xs">Uploading...</span>
                        </div>
                      ) : (
                        <PhotoIcon className="h-5 w-5" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(service.id, e)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title="Pickup Schedules">
            <div className="cp-list">
              {pickupSlots.map((slot) => {
                const formatTimeTo12Hour = (time24) => {
                  if (!time24) return "";
                  const timePart = time24.includes(" - ")
                    ? time24.split(" - ")[0]
                    : time24;
                  const [hours, minutes] = timePart.split(":");
                  const hourInt = parseInt(hours, 10);
                  const period = hourInt >= 12 ? "PM" : "AM";
                  const hour12 = hourInt % 12 || 12;
                  return `${hour12
                    .toString()
                    .padStart(2, "0")}:${minutes}:00 ${period}`;
                };
                const formattedTime = formatTimeTo12Hour(slot.time);
                return (
                  <div key={slot.id} className="cp-list-item">
                    <span className="item-name">{formattedTime}</span>
                    <div className="item-actions">
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="btn-icon delete"
                        aria-label={`Delete slot ${formattedTime}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSlot();
              }}
              className="add-item-form"
            >
              <div className="time-input-container">
                <button
                  type="button"
                  onClick={() => openPicker("start", newSlotStart)}
                  className="time-picker-button"
                >
                  {newSlotStart || "Start Time"}
                </button>
              </div>
              <button
                type="submit"
                className="add-item-btn"
                aria-label="Add new pickup slot"
              >
                Add Pickup Slot
              </button>
            </form>
          </Card>

          <PaymentMethods />
        </div>
      </div>
      <TimePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={handlePickerConfirm}
        initialTime={pickerConfig.initialValue}
      />
    </div>
  );
}
