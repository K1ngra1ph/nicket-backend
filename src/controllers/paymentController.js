const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const NumberCount = require("../models/NumberCount");
const { getMonnifyToken } = require("../services/monnifyService");
const sendWinnerEmail = require("../utils/sendWinnerEmail");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://nicket-lilac.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL || process.env.BASE_BACKEND_URL || "https://nicket-backend.onrender.com";

function normalizeStatus(raw) {
  if (!raw) return "unknown";
  const s = String(raw).trim().toLowerCase();
  if (["success", "successful", "paid"].includes(s)) return "success";
  if (["failed", "failed_payment", "cancelled", "cancel"].includes(s)) return "failed";
  return s;
}

exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, selectedNumbers } = req.body;

    if (!name || !email || !phone || !amount || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
      return res.status(400).json({ message: "Missing required fields or selected numbers" });
    }

    const amountInNaira = Number(amount);
    if (Number.isNaN(amountInNaira) || amountInNaira <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    for (const num of selectedNumbers) {
      const record = await NumberCount.findOne({ eventValue, number: num });
      if (record && record.count >= (record.maxCount || 10)) {
        return res.status(400).json({ message: `Number ${num} has reached maximum selection limit` });
      }
    }

    const accessToken = await getMonnifyToken();
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
        selectedNumbers: selectedNumbers.join(","),
      }
    };

    const monnifyResponse = await axios.post(
      `${process.env.MONNIFY_MODE === "LIVE" ? "https://api.monnify.com" : "https://sandbox.monnify.com"}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    if (!monnifyResponse?.data?.requestSuccessful) {
      const msg = monnifyResponse?.data?.responseMessage || "Monnify init failed";
      console.error("Monnify init error:", monnifyResponse?.data);
      return res.status(502).json({ message: msg });
    }

    await Payment.create({
      paymentReference,
      amount: amountInNaira,
      eventValue,
      selectedNumbers,
      name,
      email,
      phone,
      status: "pending",
      metaData: payload.metaData
    });
    
    return res.json({
      paymentReference,
      checkoutUrl: monnifyResponse.data.responseBody.checkoutUrl
    });

  } catch (err) {
    console.error("❌ Payment initiation error:", err.response?.data || err.stack || err.message);
    return res.status(500).json({ message: "Payment initiation failed", error: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const reference = req.query.reference || req.body.paymentReference;
    if (!reference) {
      return res.status(400).json({ success: false, message: "Missing payment reference" });
    }

    let payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    try {
      const token = await getMonnifyToken();
      const base = process.env.MONNIFY_MODE === "LIVE" ? "https://api.monnify.com" : "https://sandbox.monnify.com";
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

exports.redirectAfterPayment = async (req, res) => {
  try {
    const { paymentReference } = req.query;
    if (!paymentReference) {
      return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);
    }

    const paymentRecord = await Payment.findOne({ paymentReference });

    if (!paymentRecord) {
      return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
    }
    if (normalizeStatus(paymentRecord.status) === "success") {
      return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
    }
    try {
      const verifyUrl = `${BACKEND_URL}/api/payments/verify-payment?reference=${encodeURIComponent(paymentReference)}`;
      const verifyRes = await axios.get(verifyUrl, { timeout: 10000 });
      const remoteSuccess = verifyRes?.data?.success === true;

      if (remoteSuccess) {
        return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
      } else {
        return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
      }
    } catch (err) {
      console.warn("⚠️ Redirect verify-step failed, falling back to DB status:", err.message);
      return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
    }
  } catch (error) {
    console.error("Redirect error:", error);
    return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);
  }
};

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
    const status = (paymentStatus || "").toString().toUpperCase();

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
