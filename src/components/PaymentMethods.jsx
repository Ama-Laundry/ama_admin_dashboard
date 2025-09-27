import React, { useState, useEffect } from "react";
import { getPaymentGateways, updatePaymentGateways } from "../api/controlPanel";
import ToggleSwitch from "./ToggleSwitch";

const PaymentMethods = () => {
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const gateways = await getPaymentGateways();
        gateways.forEach((gateway) => {
          if (gateway.id === "stripe") {
            setStripeEnabled(true);
          }
          if (gateway.id === "paypal") {
            setPaypalEnabled(true);
          }
        });
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPaymentMethods();
  }, []);

  const handleSave = async () => {
    try {
      await updatePaymentGateways({
        stripe: { enabled: stripeEnabled },
        paypal: { enabled: paypalEnabled },
      });
      alert("Payment methods updated successfully!");
    } catch (error) {
      console.error("Error updating payment methods:", error);
      alert("Failed to update payment methods.");
    }
  };

  if (loading) {
    return <div>Loading Payment Methods...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Payment Methods</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg">
            Stripe (includes Apple Pay and Google Pay)
          </span>
          <ToggleSwitch
            checked={stripeEnabled}
            onChange={() => setStripeEnabled(!stripeEnabled)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg">PayPal</span>
          <ToggleSwitch
            checked={paypalEnabled}
            onChange={() => setPaypalEnabled(!paypalEnabled)}
          />
        </div>
      </div>
      <div className="mt-6">
        <button
          onClick={handleSave}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default PaymentMethods;
