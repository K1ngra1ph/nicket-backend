const Payment = require("../../models/Payment");

module.exports = async function getPaymentReference(req, res) {
  try {
    const { transactionReference } = req.query;
    if (!transactionReference) {
      return res.status(400).json({ message: "Missing transactionReference" });
    }

    const payment = await Payment.findOne({ transactionReference });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json({ paymentReference: payment.paymentReference });
  } catch (err) {
    console.error("❌ getPaymentReference ERROR:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
