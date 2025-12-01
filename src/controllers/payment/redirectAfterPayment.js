import Payment from "../../models/Payment.js";

export default async function redirectAfterPayment(req, res) {
  try {
    const { paymentReference } = req.query;
    console.log("🔵 [DEBUG] Redirect triggered:", paymentReference);

    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      console.warn("⚠️ Payment not found, redirecting to failure page");
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-verify.html?failed=true`
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-verify.html?transactionReference=${encodeURIComponent(
        payment.transactionReference
      )}`
    );

  } catch (err) {
    console.error("❌ [DEBUG] redirectAfterPayment ERROR:", err.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-verify.html?failed=true`
    );
  }
}
