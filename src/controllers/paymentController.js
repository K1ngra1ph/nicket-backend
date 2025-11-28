const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const NumberCount = require("../models/NumberCount");
const { getMonnifyToken } = require("../services/monnifyService");
const sendWinnerEmail = require("../utils/sendWinnerEmail");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://nicket-lilac.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL || process.env.BASE_BACKEND_URL || "https://nicket-backend.onrender.com";
const MONNIFY_MODE = process.env.MONNIFY_MODE || "SANDBOX";

function normalizeStatus(raw) {
  if (!raw) return "unknown";
  const s = String(raw).trim().toLowerCase();
  if (["success", "successful", "paid"].includes(s)) return "success";
  if (["failed", "failed_payment", "cancelled", "cancel"].includes(s)) return "failed";
  return s;
}

// -------------------- Initiate Payment --------------------
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, selectedNumbers } = req.body;

    if (!name || !email || !phone || !amount || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
      console.error("❌ Missing required fields or selected numbers", req.body);
      return res.status(400).json({ message: "Missing required fields or selected numbers" });
    }

    const amountInNaira = Number(amount);
    if (Number.isNaN(amountInNaira) || amountInNaira <= 0) {
      console.error("❌ Invalid amount:", amount);
      return res.status(400).json({ message: "Invalid amount" });
    }

    const numbersToSend = selectedNumbers.map(n => Number(n));
    if (!numbersToSend.every(n => Number.isInteger(n) && n > 0)) {
      console.error("❌ Invalid selected numbers:", selectedNumbers);
      return res.status(400).json({ message: "Invalid selected numbers" });
    }

    // Check max selection per number
    for (const num of numbersToSend) {
      const record = await NumberCount.findOne({ eventValue, number: num });
      if (record && record.count >= (record.maxCount || 10)) {
        console.error(`❌ Number ${num} has reached maximum selection limit`);
        return res.status(400).json({ message: `Number ${num} has reached maximum selection limit` });
      }
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
      console.error("❌ MONNIFY_CONTRACT_CODE not set in environment");
      return res.status(500).json({ message: "Server misconfiguration: contract code missing" });
    }

    const paymentReference = `NICKET-${Date.now()}`;
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
      redirectUrl: `${BACKEND_URL}/api/payments/redirect`,
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: numbersToSend // store as array in DB, send as-is
      }
    };

    console.log("💳 Monnify payload:", JSON.stringify(payload, null, 2));

    const monnifyUrl = MONNIFY_MODE === "LIVE"
      ? "https://api.monnify.com/api/v1/merchant/transactions/init-transaction"
      : "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction";

    let monnifyResponse;
    try {
      monnifyResponse = await axios.post(monnifyUrl, payload, {
        headers: {
          Authorization: `Bearer ${await getMonnifyToken()}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });
    } catch (err) {
      const msg = err.response?.data || err.message;
      console.error("❌ Monnify init failed:", msg);
      return res.status(err.response?.status || 502).json({ message: "Monnify init failed", error: msg });
    }

    if (!monnifyResponse?.data?.requestSuccessful) {
      console.error("❌ Monnify init error:", monnifyResponse.data);
      return res.status(502).json({
        message: monnifyResponse?.data?.responseMessage || "Monnify init failed",
        error: monnifyResponse?.data
      });
    }

    const paymentDoc = await Payment.create({
      paymentReference,
      amount: amountInNaira,
      eventValue,
      selectedNumbers: numbersToSend,
      name,
      email,
      phone,
      status: "pending",
      metaData: payload.metaData
    });

    console.log("✅ Payment record created:", paymentDoc.paymentReference);
    return res.json({
      paymentReference,
      checkoutUrl: monnifyResponse.data.responseBody.checkoutUrl
    });

  } catch (err) {
    console.error("❌ Payment initiation error:", err.response?.data || err.stack || err.message);
    return res.status(500).json({ message: "Payment initiation failed", error: err.message });
  }
};

// -------------------- Verify Payment --------------------
exports.verifyPayment = async (req, res) => {
  try {
    const reference = req.query.reference || req.body.paymentReference;
    if (!reference) return res.status(400).json({ success: false, message: "Missing payment reference" });

    let payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    try {
      const token = await getMonnifyToken();
      const base = MONNIFY_MODE === "LIVE" ? "https://api.monnify.com" : "https://sandbox.monnify.com";
      const monnifyRes = await axios.get(
        `${base}/api/v2/transactions/${reference}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      if (monnifyRes?.data?.requestSuccessful) {
        const txn = monnifyRes.data.responseBody;
        const normalized = normalizeStatus(txn.paymentStatus);
        payment.status = normalized;
        payment.amountPaid = txn.amountPaid || payment.amountPaid;

        if (txn.metaData) payment.metaData = { ...payment.metaData, ...txn.metaData };
        await payment.save();
      }
    } catch (err) {
      console.warn("⚠️ Monnify verification call failed:", err.message);
    }

    const isSuccess = normalizeStatus(payment.status) === "success";

    return res.json({ success: isSuccess, status: payment.status, data: payment });
  } catch (err) {
    console.error("❌ Payment verification error:", err.stack || err.message);
    return res.status(500).json({ success: false, message: "Internal error verifying payment" });
  }
};

// -------------------- Internal Payment Verification --------------------
async function payment_verify(reference) {
  if (!reference) throw new Error("Missing reference");

  const baseUrl = MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com/api/v2/transactions/verify"
    : "https://sandbox.monnify.com/api/v2/transactions/verify";

  const token = await getMonnifyToken();
  const res = await axios.get(`${baseUrl}/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000
  });

  return res.data;
}

// -------------------- Redirect After Payment --------------------
exports.redirectAfterPayment = async (req, res) => {
  try {
    const paymentReference = req.query.paymentReference;
    if (!paymentReference) return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);

    let payment = await Payment.findOne({ paymentReference });
    if (!payment) {
      return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
    }

    const status = normalizeStatus(payment.status);
    if (status === "success") {
      return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
    }

    try {
      const verify = await payment_verify(paymentReference);
      if (verify?.requestSuccessful && normalizeStatus(verify?.responseBody?.paymentStatus) === "success") {
        payment.status = "success";
        await payment.save();

        return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
      }
    } catch (err) {
      console.error("❌ Redirect verification failed:", err.message);
    }

    return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
  } catch (err) {
    return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);
  }
};

// -------------------- Monnify Webhook --------------------
exports.monnifyWebhook = async (req, res) => {
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

    const { paymentReference, paymentStatus, amountPaid, metaData, paymentMethod } = eventData;
    const status = (paymentStatus || "").toUpperCase();

    let payment = await Payment.findOne({ paymentReference });
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
      payment.metaData = { ...payment.metaData, paymentMethod, ...(metaData || {}) };
      await payment.save();
    }

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

      if (metaData.playerEmail && metaData.playerName) {
        try {
          await sendWinnerEmail(metaData.playerEmail, metaData.playerName, selectedNumbers, metaData.event);
        } catch (err) {
          console.error("❌ Failed to send winner email:", err.message);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.stack || err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
