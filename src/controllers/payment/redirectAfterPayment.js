const Payment = require("../../models/Payment");
const verifyWithMonnify = require("./verifyWithMonnify");

module.exports = async function redirectAfterPayment(req, res) {
  try {
    const { paymentReference } = req.query;
    console.log("🔵 [DEBUG] Redirect triggered:", paymentReference);

    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      return res.redirect(`${process.env.FRONTEND_URL}/index.html`);
    }

    const verify = await verifyWithMonnify(payment.transactionReference);
    const status = verify.responseBody?.paymentStatus;

    console.log("🔵 [DEBUG] Redirect verification status:", status);

    if (status === "PAID") {
      payment.status = "successful";
      payment.amountPaid = verify.responseBody.amountPaid;
      await payment.save();
      return res.redirect(`${process.env.FRONTEND_URL}/index.html`);
    }

    return res.redirect(`${process.env.FRONTEND_URL}/game.html`);

  } catch (err) {
    console.error("❌ [DEBUG] redirectAfterPayment ERROR:", err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/game.html`);
  }
};
