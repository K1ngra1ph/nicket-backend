// controllers/payment/verifyPayment.js
const Payment = require("../../models/Payment");
const verifyWithMonnify = require("./verifyWithMonnify");

module.exports = async function verifyPayment(req, res) {
  try {
    const { paymentReference } = req.params;
    console.log("🟢 [DEBUG] verifyPayment for:", paymentReference);

    const payment = await Payment.findOne({ paymentReference });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const result = await verifyWithMonnify(payment.transactionReference);
    return res.json(result);

  } catch (err) {
    console.error("❌ [DEBUG] verifyPayment ERROR:", err.message);
    return res.status(500).json({ message: "Verify error" });
  }
};
