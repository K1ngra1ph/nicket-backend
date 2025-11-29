// controllers/payment/monnifyWebhook.js
const crypto = require("crypto");
const Payment = require("../../models/Payment");
const SelectedNumber = require("../../models/SelectedNumber");

module.exports = async function monnifyWebhook(req, res) {
  try {
    console.log("📩 [DEBUG] Webhook received");

    const rawBody = req.body;
    const signature = req.headers["monnify-signature"];

    if (!signature) return res.status(400).send("Missing signature");

    const expectedSig = crypto.createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSig !== signature) return res.status(403).send("Invalid signature");

    const event = JSON.parse(rawBody.toString("utf8"));
    const { paymentReference, paymentStatus, metaData, amountPaid } = event.eventData;

    console.log("📩 [DEBUG] Webhook parsed:", {
      paymentReference, paymentStatus, amountPaid
    });

    let payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      payment = await Payment.create({
        paymentReference,
        amountPaid,
        status: paymentStatus === "SUCCESSFUL" ? "successful" : "failed",
        metaData
      });
    } else {
      payment.status = paymentStatus === "SUCCESSFUL" ? "successful" : "failed";
      payment.amountPaid = amountPaid;
      await payment.save();
    }

    if (payment.status === "successful" && metaData?.selectedNumbers) {
      const numbers = metaData.selectedNumbers.split(",").map(Number);

      console.log("📩 [DEBUG] Reserving numbers:", numbers);

      await SelectedNumber.insertMany(numbers.map(n => ({
        number: n,
        paymentReference,
        event: metaData.event,
        userEmail: metaData.playerEmail
      })));
    }

    res.send("OK");

  } catch (err) {
    console.error("❌ [DEBUG] monnifyWebhook ERROR:", err.message);
    return res.status(500).send("Error");
  }
};
