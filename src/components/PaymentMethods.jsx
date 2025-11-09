import React, { useState, useEffect } from "react";
import { getPaymentGateways, updatePaymentGateways } from "../api/controlPanel";
import ToggleSwitch from "./ToggleSwitch";
import Card from "./Card";

const PaymentMethods = () => {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedGateways = await getPaymentGateways();
        setGateways(fetchedGateways);
      } catch (err) {
        console.error("Error fetching payment methods:", err);
        setError(err.message || "Could not load payment methods.");
      } finally {
        setLoading(false);
      }
    };
    fetchPaymentMethods();
  }, []);

  const handleToggleChange = (id) => {
    // This function now only updates the local state
    setGateways(
      gateways.map((gateway) =>
        gateway.id === id ? { ...gateway, enabled: !gateway.enabled } : gateway
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage("");
    try {
      const settingsToUpdate = gateways.reduce((acc, gateway) => {
        acc[gateway.id] = { enabled: gateway.enabled };
        return acc;
      }, {});

      await updatePaymentGateways(settingsToUpdate);
      setSuccessMessage("Payment methods updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000); // Hide message after 3s
    } catch (err) {
      console.error("Error updating payment methods:", err);
      setError(err.message || "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card title="Payment Methods">
        <div>Loading Payment Methods...</div>
      </Card>
    );
  }

  return (
    <Card title="Payment Methods ">
      <div className="flex flex-col justify-center h-full">
        {/* Top Section */}
        <div>
          <p className="sub">
            Enable or disable the payment gateways from your Site Settings.
          </p>

          {/* {error && (
            <p className="text-red-500 bg-red-100 p-3 rounded my-4">{error}</p>
          )} */}
          {successMessage && (
            <p className="text-green-700 bg-green-100 p-3 rounded my-4">
              {successMessage}
            </p>
          )}

          <div className="cp-list mt-4">
            {gateways.length > 0 ? (
              gateways.map((gateway) => (
                <div key={gateway.id} className="cp-list-item">
                  <div className="flex-1">
                    <span className="item-name">{gateway.title}</span>
                    {gateway.description && (
                      <p className="text-sm text-gray-700 mt-1">
                        {gateway.description}
                      </p>
                    )}
                  </div>
                  <div className="item-actions">
                    <ToggleSwitch
                      checked={gateway.enabled}
                      onChange={() => handleToggleChange(gateway.id)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-black">
                No payment methods found in your Site Settings.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section (Button) */}
        <div className="mt-6  text-right">
          <button
            onClick={handleSave}
            className="btn-add"
            disabled={isSaving || loading}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PaymentMethods;
