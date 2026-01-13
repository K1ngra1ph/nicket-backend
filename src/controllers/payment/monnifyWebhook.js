import crypto from "crypto";
import Payment from "../../models/Payment.js";
import NumberCount from "../../models/SelectedNumber.js";

export default async function monnifyWebhook(req, res) {
  try {
    console.log("📩 [DEBUG] Webhook received");

    const rawBody = req.body;
    const signature = req.headers["monnify-signature"];

    if (!signature) return res.status(400).send("Missing signature");

    const expectedSig = crypto
      .createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSig !== signature) return res.status(403).send("Invalid signature");

    const event = JSON.parse(rawBody.toString("utf8"));
    const { paymentReference, paymentStatus, metaData, amountPaid } = event.eventData;

    console.log("📩 [DEBUG] Payment Update:", { paymentReference, status: paymentStatus });

    let payment = await Payment.findOne({ paymentReference });

    const newStatus = paymentStatus === "SUCCESSFUL" ? "successful" : "failed";

    if (!payment) {
      const numbers = metaData?.selectedNumbers ? metaData.selectedNumbers.split(",").map(Number) : [];
      payment = await Payment.create({
        paymentReference,
        amountPaid,
        amount: amountPaid,
        status: newStatus,
        email: metaData?.playerEmail || "unknown@nicket.com",
        name: metaData?.playerName || "Unknown",
        phone: "0000000000",
        eventValue: metaData?.event || "Unknown",
        selectedNumbers: numbers
      });
    } else {
      payment.status = newStatus;
      payment.amountPaid = amountPaid;
      if ((!payment.selectedNumbers || payment.selectedNumbers.length === 0) && metaData?.selectedNumbers) {
         payment.selectedNumbers = metaData.selectedNumbers.split(",").map(Number);
      }
      await payment.save();
    }
    if (newStatus === "successful") {
      const numbers = payment.selectedNumbers;
      const eventValue = payment.eventValue;

      console.log(`📩 [DEBUG] Updating counts for Event: ${eventValue}, Numbers: ${numbers}`);
      for (const num of numbers) {
        await NumberCount.incrementCount(eventValue, num);
      }
    }

    res.send("OK");

  } catch (err) {
    console.error("❌ [DEBUG] monnifyWebhook ERROR:", err.message);
    return res.status(200).send("Error logged");
  }
}