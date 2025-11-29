// controllers/payment/redirectAfterPayment.js
const Payment = require("../../models/Payment");

module.exports = async function redirectAfterPayment(req, res) {
  try {
    const { paymentReference } = req.query;
    console.log("🔵 [DEBUG] Redirect triggered:", paymentReference);

    // Find the payment record in DB
    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      console.warn("⚠️ Payment not found, redirecting to failure page");
      // Redirect to bridge with failed flag
      return res.redirect(`${process.env.FRONTEND_URL}/payment-verify.html?failed=true`);
    }

    // Payment exists → redirect to bridge page with transactionReference
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-verify.html?transactionReference=${encodeURIComponent(payment.transactionReference)}`
    );

  } catch (err) {
    console.error("❌ [DEBUG] redirectAfterPayment ERROR:", err.message);
    // On error, redirect to bridge page with failed flag
    return res.redirect(`${process.env.FRONTEND_URL}/payment-verify.html?failed=true`);
  }
};
