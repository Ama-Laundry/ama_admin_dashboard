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
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [recentlyUploaded, setRecentlyUploaded] = useState({});
  const [imageVersion, setImageVersion] = useState({});

  // State for managing the TimePicker modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({
    target: null,
    initialValue: "",
  });

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

  // Clear success message after 3 seconds
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  // Clear recently uploaded indicator after 5 seconds
  useEffect(() => {
    if (Object.keys(recentlyUploaded).length > 0) {
      const timer = setTimeout(() => {
        setRecentlyUploaded({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUploaded]);

  const handlePriceChange = (id, newPrice) => {
    const updatedPrices = prices.map((item) =>
      item.id === id ? { ...item, price: parseFloat(newPrice) || 0 } : item
    );
    setPrices(updatedPrices);
  };

  const handlePriceUpdateOnBlur = (id, price) => {
    updateServicePrice(id, price).catch((err) => {
      console.error("Failed to update price:", err);
      setError("Failed to update price. Check connection and try again.");
    });
  };

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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await deletePickupSlot(id);
      setPickupSlots(pickupSlots.filter((slot) => slot.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = () => {
    const newAvailability = !dailyAvailability;
    setDailyAvailability(newAvailability);
    updateSettings({
      daily_availability: newAvailability,
    });
  };

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
    setUploadSuccess(false);
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
      setUploadSuccess(true);
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
      setUploadSuccess(true);
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

      {uploadSuccess && (
        <div className="bg-green-900/50 text-green-300 p-4 rounded-lg text-center">
          <p>
            <strong>Success:</strong> {successMessage}
          </p>
        </div>
      )}

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
                  <span className="item-name">{item.name}</span>
                  <div className="item-actions">
                    {/* +++ MODIFIED: Changed color and added margin +++ */}
                    <span className="text-lg text-black mr-1">$</span>
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
                    {/* +++ ADDED: Added AUD label for clarity +++ */}
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
