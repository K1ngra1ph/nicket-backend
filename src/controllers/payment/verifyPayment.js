// controllers/payment/verifyPayment.js
const Payment = require("../../models/Payment");
const verifyWithMonnify = require("./verifyWithMonnify");

module.exports = async function verifyPayment(req, res) {
  console.log("🔍 Debug: Incoming params:", req.params);

  try {
    const { paymentReference } = req.params;

    console.log("🔍 Debug: Extracted paymentReference:", paymentReference);

    const payment = await Payment.findOne({ paymentReference }).catch(err => {
      console.error("❌ Debug: Error querying Payment:", err);
      return null;
    });

    console.log("🔍 Debug: Payment query result:", payment);

    if (!payment) {
      console.log("⚠️ Debug: Payment not found for:", paymentReference);
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    console.log("🔍 Debug: Verifying with Monnify using transactionReference:", payment.transactionReference);

    const result = await verifyWithMonnify(payment.transactionReference).catch(err => {
      console.error("❌ Debug: Error in verifyWithMonnify:", err);
      return null;
    });

    console.log("🔍 Debug: Monnify verification result:", result);

    return res.json({
      success: result?.requestSuccessful,
      paymentStatus: result?.responseBody?.paymentStatus,
      amountPaid: result?.responseBody?.amountPaid,
      paymentReference,
      transactionReference: payment.transactionReference,
      raw: result
    });

  } catch (err) {
    console.error("❌ Debug: Unexpected error:", err);
    return res.status(500).json({ success: false, message: "Verify error" });
  }
};
