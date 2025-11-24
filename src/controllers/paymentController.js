const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const NumberCount = require("../models/NumberCount");
const { getMonnifyToken } = require("../services/monnifyService");
const sendWinnerEmail = require("../utils/sendWinnerEmail");

/**
 * Initiate a payment via Monnify
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, selectedNumbers } = req.body;

    // Validate input
    if (!name || !email || !phone || !amount || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
      return res.status(400).json({ message: "Missing required fields or selected numbers" });
    }

    // Validate number limits
    for (const num of selectedNumbers) {
      const record = await NumberCount.findOne({ eventValue, number: num });
      if (record && record.count >= (record.maxCount || 10)) {
        return res.status(400).json({ message: `Number ${num} has reached maximum selection limit` });
      }
    }

    // Get Monnify access token
    const accessToken = await getMonnifyToken();

    // Prepare payment payload
    const paymentReference = `NICKET-${Date.now()}`;
    const amountInNaira = Number(amount);

    const payload = {
      amount: amountInNaira,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerId: email,
      paymentReference,
      paymentDescription: `Nicket Payment - ${eventValue || "Wallet"}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: "https://nicket-lilac.vercel.app/game?paid=true",
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: selectedNumbers.join(",")
      }
    };

    // Call Monnify API
    const monnifyResponse = await axios.post(
      "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction",
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    if (!monnifyResponse.data.requestSuccessful) {
      console.error("Monnify error:", monnifyResponse.data);
      return res.status(500).json({ message: monnifyResponse.data.responseMessage });
    }

    // Save payment record
    await Payment.create({
      paymentReference,
      amount,
      eventValue,
      selectedNumbers,
      name,
      email,
      phone,
      metaData: payload.metaData
    });

    res.json({
      paymentReference,
      checkoutUrl: monnifyResponse.data.responseBody.checkoutUrl
    });

  } catch (err) {
    console.error("❌ Payment initiation error:", err.response?.data || err.stack || err.message);
    res.status(500).json({ message: "Payment failed", error: err.message });
  }
};

/**
 * Monnify webhook handler
 */
exports.monnifyWebhook = async (req, res) => {
  try {
    const rawBody = req.body; // raw buffer
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

    // Fetch or create payment
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

    // Handle selected numbers and winner logic
    if (paymentStatus === "SUCCESSFUL" && metaData?.selectedNumbers) {
      const selectedNumbers = metaData.selectedNumbers.toString().split(",").map(n => parseInt(n));

      for (const num of selectedNumbers) {
        await NumberCount.findOneAndUpdate(
          { eventValue: metaData.event, number: num },
          { $inc: { count: 1 }, $setOnInsert: { maxCount: 10 } },
          { upsert: true, new: true }
        );
      }

      // Send winner email
      if (metaData.playerEmail) {
        try {
          await sendWinnerEmail(metaData.playerEmail, metaData.playerName, selectedNumbers, metaData.event);
        } catch (err) {
          console.error("❌ Failed to send winner email:", err);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.stack || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};