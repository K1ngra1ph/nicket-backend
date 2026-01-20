import crypto from "crypto";
import Payment from "../../models/Payment.js";
import NumberCount from "../../models/SelectedNumber.js";
import sendEmail from "./sendEmail.js";

export default async function monnifyWebhook(req, res) {
  try {
    const signature = req.headers["monnify-signature"];
    const rawBody = req.body;

    if (!signature) return res.status(400).send("Missing signature");

    const expectedSig = crypto
      .createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSig !== signature) {
      console.error("⚠️ [WEBHOOK] Unauthorized Attempt - Invalid Signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    const { paymentReference, paymentStatus, metaData, amountPaid, transactionReference } = event.eventData;

    console.log(`📩 [WEBHOOK] Processing: ${paymentReference} | Status: ${paymentStatus}`);

    let payment = await Payment.findOne({ paymentReference });

    const isSuccessful = paymentStatus === "SUCCESSFUL" || paymentStatus === "PAID";
    const statusToSet = isSuccessful ? "successful" : "failed";

    if (!payment) {
      const numbers = metaData?.selectedNumbers ? metaData.selectedNumbers.split(",").map(Number) : [];
      payment = await Payment.create({
        paymentReference,
        transactionReference,
        amount: amountPaid,
        amountPaid: amountPaid,
        status: statusToSet,
        email: metaData?.playerEmail || "unknown@nicket.com",
        name: metaData?.playerName || "Guest Player",
        phone: metaData?.playerPhone || "0000000000",
        eventValue: metaData?.event || "Unknown",
        selectedNumbers: numbers,
        metadata: { winner: false }
      });
    }

    if (isSuccessful && payment.status !== "successful") {
      
      payment.status = "successful";
      payment.amountPaid = Number(amountPaid);
      payment.transactionReference = transactionReference;
      
      if ((!payment.selectedNumbers || payment.selectedNumbers.length === 0) && metaData?.selectedNumbers) {
        payment.selectedNumbers = metaData.selectedNumbers.split(",").map(Number);
      }

      await payment.save();

      const eventValue = payment.eventValue;
      for (const num of payment.selectedNumbers) {
        try {
          await NumberCount.incrementCount(eventValue, num);
        } catch (countErr) {
          console.error(`❌ Failed to increment number ${num}:`, countErr.message);
        }
      }

      console.log(`📨 [WEBHOOK] Payment Verified. Triggering email to ${payment.email}`);
      sendEmail(payment).catch(err => console.error("❌ Post-payment Email Error:", err));

    } else if (!isSuccessful) {
      payment.status = "failed";
      await payment.save();
    }

    res.status(200).send("OK");

  } catch (err) {
    console.error("❌ [WEBHOOK] System Error:", err.message);
    return res.status(200).send("Error processed");
  }
}