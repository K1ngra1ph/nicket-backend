const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Payment = require("../models/Payment");
const NumberCount = require("../models/NumberCount");
const sendWinnerEmail = require("../utils/sendWinnerEmail");

router.post("/monnify", async (req, res) => {
  try {
    const rawBody = req.body;
    const signatureHeader = req.headers["monnify-signature"];

    if (!signatureHeader) return res.status(400).send("Missing signature");

    const expectedSignature = crypto.createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signatureHeader) return res.status(403).send("Invalid signature");

    const event = JSON.parse(rawBody.toString("utf8"));
    const eventData = event.eventData;

    if (!eventData || !eventData.paymentReference) return res.status(400).send("Missing paymentReference");

    const { paymentReference, paymentStatus, amountPaid, metaData } = eventData;

    let payment = await Payment.findOne({ paymentReference });
    if (!payment) {
      payment = await Payment.create({
        paymentReference,
        amountPaid: amountPaid || 0,
        status: paymentStatus?.toLowerCase() || "unknown",
        metaData: metaData || {}
      });
    } else {
      payment.status = paymentStatus.toLowerCase();
      payment.amountPaid = amountPaid || payment.amountPaid;
      await payment.save();
    }

    if (paymentStatus === "SUCCESSFUL" && metaData?.selectedNumbers) {
      const selectedNumbers = Array.isArray(metaData.selectedNumbers)
        ? metaData.selectedNumbers
        : metaData.selectedNumbers.map(Number);

      for (const num of selectedNumbers) {
        await NumberCount.findOneAndUpdate(
          { eventValue: metaData.event, number: num },
          { $inc: { count: 1 }, $setOnInsert: { maxCount: 10 } },
          { upsert: true, new: true }
        );
      }

      // Send winner email
      if (metaData.playerEmail && metaData.playerName) {
        try {
          await sendWinnerEmail(metaData.playerEmail, metaData.playerName, selectedNumbers, metaData.event);
        } catch (err) {
          console.error("❌ Failed to send winner email:", err.message);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.stack || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;