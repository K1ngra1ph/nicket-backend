const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const NumberCount = require("../models/NumberCount");
const { getMonnifyToken } = require("../services/monnifyService");
const sendWinnerEmail = require("../utils/sendWinnerEmail");

// Initiate Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, selectedNumbers } = req.body;

    if (!name || !email || !phone || !amount || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
      return res.status(400).json({ message: "Missing required fields or selected numbers" });
    }

    // Check number availability
    for (const num of selectedNumbers) {
      const record = await NumberCount.findOne({ eventValue, number: num });
      if (record && record.count >= (record.maxCount || 10)) {
        return res.status(400).json({ message: `Number ${num} has reached maximum selection limit` });
      }
    }

    const accessToken = await getMonnifyToken();
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
      redirectUrl: "https://nicket-lilac.vercel.app",
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: selectedNumbers.join(","),
      }
    };

    const monnifyResponse = await axios.post(
      "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction",
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    if (!monnifyResponse.data.requestSuccessful) {
      return res.status(500).json({ message: monnifyResponse.data.responseMessage });
    }

    await Payment.create({
      paymentReference,
      amount,
      eventValue,
      selectedNumbers,
      name,
      email,
      phone,
      status: "pending",
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

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference)
      return res.status(400).json({ success: false, message: "Missing payment reference" });

    let payment = await Payment.findOne({ paymentReference: reference });
    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found" });

    // Fetch latest status from Monnify API
    try {
      const token = await getMonnifyToken();
      const monnifyRes = await axios.get(
        `https://sandbox.monnify.com/api/v2/transactions/${reference}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      if (monnifyRes.data.requestSuccessful) {
        const txn = monnifyRes.data.responseBody;
        payment.status = txn.paymentStatus.toLowerCase();
        payment.amountPaid = txn.amountPaid || payment.amountPaid;
        await payment.save();
      }
    } catch (err) {
      console.warn("⚠️ Monnify API error, returning DB status:", err.message);
    }

    const isSuccess = ["success", "successful", "paid"].includes((payment.status || "").toLowerCase());

    return res.json({
      success: isSuccess,
      status: payment.status,
      data: payment
    });

  } catch (err) {
    console.error("❌ Payment verification error:", err.stack || err.message);
    return res.status(500).json({ success: false, message: "Internal error verifying payment" });
  }
};

// Monnify Webhook
exports.monnifyWebhook = async (req, res) => {
  try {
    const rawBody = req.body;
    const signatureHeader = req.headers["monnify-signature"];

    if (!signatureHeader) return res.status(400).send("Missing signature");

    // Validate HMAC SHA512 signature
    const expectedSignature = crypto.createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signatureHeader) return res.status(403).send("Invalid signature");

    const event = JSON.parse(rawBody.toString("utf8"));
    const eventData = event.eventData;

    if (!eventData || !eventData.paymentReference) return res.status(400).send("Missing paymentReference");

    const { paymentReference, paymentStatus, amountPaid, metaData, paymentMethod } = eventData;

    // Update or create payment record
    let payment = await Payment.findOne({ paymentReference });
    const status = (paymentStatus || "").toUpperCase();

    if (!payment) {
      payment = await Payment.create({
        paymentReference,
        amountPaid: amountPaid || 0,
        status,
        metaData: { ...metaData, paymentMethod }
      });
    } else {
      payment.status = status;
      payment.amountPaid = amountPaid || payment.amountPaid;
      payment.metaData = { ...payment.metaData, paymentMethod };
      await payment.save();
    }

    // Handle selected numbers if successful
    const isSuccessful = ["SUCCESS", "SUCCESSFUL", "PAID"].includes(status);
    if (isSuccessful && metaData?.selectedNumbers) {
      const selectedNumbers = Array.isArray(metaData.selectedNumbers)
        ? metaData.selectedNumbers.map(Number)
        : metaData.selectedNumbers.toString().split(",").map(Number);

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
};
