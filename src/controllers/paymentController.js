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

// -------------------------------------------------------
// -------------------- Initiate Payment -----------------
// -------------------------------------------------------
exports.initiatePayment = async (req, res) => {
  try {
    console.log("\n============== 🔵 INITIATE PAYMENT CALLED 🔵 ==============");
    console.log("📥 Incoming Body:", JSON.stringify(req.body, null, 2));

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

    // Debug: selected numbers validation
    console.log("🔢 Selected Numbers (Normalised):", numbersToSend);

    for (const num of numbersToSend) {
      const record = await NumberCount.findOne({ eventValue, number: num });
      console.log(`🔍 DB Check For Number ${num}:`, record);
      if (record && record.count >= (record.maxCount || 10)) {
        console.error(`❌ Number ${num} has reached maximum selection limit`);
        return res.status(400).json({ message: `Number ${num} has reached maximum selection limit` });
      }
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
      console.error("❌ MONNIFY_CONTRACT_CODE not set in env");
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
        selectedNumbers: numbersToSend
      }
    };

    console.log("💳 Debug — Monnify INIT Payload:", JSON.stringify(payload, null, 2));
    console.log("🌍 Redirect URL:", payload.redirectUrl);
    console.log("📌 Contract Code:", process.env.MONNIFY_CONTRACT_CODE);

    const monnifyUrl =
      MONNIFY_MODE === "LIVE"
        ? "https://api.monnify.com/api/v1/merchant/transactions/init-transaction"
        : "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction";

    console.log("🔗 Monnify INIT URL:", monnifyUrl);

    // ---------- DEBUG TOKEN ----------
    const token = await getMonnifyToken();
    console.log("🟣 Monnify Token Retrieved:", token ? "YES" : "NO", token?.substring(0, 10) + "...");

    // ---------- SEND INIT PAYMENT ----------
    let monnifyResponse;
    try {
      monnifyResponse = await axios.post(monnifyUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });
    } catch (err) {
      console.error("❌ Monnify INIT error block TRIGGERED");

      console.error("🟥 ERROR MESSAGE:", err.message);
      console.error("🟥 ERROR RESPONSE DATA:", err.response?.data);
      console.error("🟥 ERROR RESPONSE STATUS:", err.response?.status);
      console.error("🟥 ERROR REQUEST BODY SENT:", JSON.stringify(payload, null, 2));

      return res
        .status(err.response?.status || 502)
        .json({ message: "Monnify init failed", error: err.response?.data || err.message });
    }

    console.log("🟩 Monnify Raw Response:", JSON.stringify(monnifyResponse.data, null, 2));

    if (!monnifyResponse?.data?.requestSuccessful) {
      console.error("❌ Monnify rejected INIT:", monnifyResponse.data);
      return res.status(502).json({
        message: monnifyResponse.data.responseMessage || "Monnify init failed",
        error: monnifyResponse.data
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

    console.log("✅ Payment saved to DB:", paymentDoc);

    return res.json({
      paymentReference,
      checkoutUrl: monnifyResponse.data.responseBody.checkoutUrl
    });
  } catch (err) {
    console.error("❌ FINAL INIT ERROR:", err.stack || err.message);
    return res.status(500).json({ message: "Payment initiation failed", error: err.message });
  }
};

// -------------------------------------------------------
// -------------------- Verify Payment -------------------
// -------------------------------------------------------
exports.verifyPayment = async (req, res) => {
  try {
    console.log("\n============== 🔵 VERIFY PAYMENT CALLED 🔵 ==============");

    const reference = req.query.reference || req.body.paymentReference;
    console.log("🔎 Reference:", reference);

    if (!reference) return res.status(400).json({ success: false, message: "Missing reference" });

    let payment = await Payment.findOne({ paymentReference: reference });
    console.log("🔎 Payment In DB:", payment);

    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    try {
      const token = await getMonnifyToken();
      console.log("🟣 Verification Token:", token?.substring(0, 10) + "...");

      const base = MONNIFY_MODE === "LIVE" ? "https://api.monnify.com" : "https://sandbox.monnify.com";
      const url = `${base}/api/v2/transactions/${reference}`;
      console.log("🔗 Verification URL:", url);

      const monnifyRes = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      console.log("🟩 Monnify Verify Response:", monnifyRes.data);

      if (monnifyRes?.data?.requestSuccessful) {
        const txn = monnifyRes.data.responseBody;

        console.log("🟩 Parsed Transaction:", txn);

        const normalized = normalizeStatus(txn.paymentStatus);
        payment.status = normalized;
        payment.amountPaid = txn.amountPaid;

        if (txn.metaData) {
          console.log("🟡 Updating metadata with:", txn.metaData);
          payment.metaData = { ...payment.metaData, ...txn.metaData };
        }

        await payment.save();
        console.log("💾 Updated DB Payment:", payment);
      }
    } catch (err) {
      console.warn("⚠️ Verification call failed:", err.message);
    }

    const isSuccess = normalizeStatus(payment.status) === "success";
    return res.json({ success: isSuccess, status: payment.status, data: payment });
  } catch (err) {
    console.error("❌ Verification error:", err.stack || err.message);
    return res.status(500).json({ success: false, message: "Internal verification error" });
  }
};

// -------------------------------------------------------
// -------------------- Redirect After Payment -----------
// -------------------------------------------------------
exports.redirectAfterPayment = async (req, res) => {
  try {
    console.log("\n============== 🔵 REDIRECT AFTER PAYMENT 🔵 ==============");

    const paymentReference = req.query.paymentReference;
    console.log("🔗 Redirect Reference:", paymentReference);

    if (!paymentReference) return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);

    const payment = await Payment.findOne({ paymentReference });
    console.log("🔎 Payment Retrieved:", payment);

    if (!payment) {
      return res.redirect(
        `${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`
      );
    }

    const status = normalizeStatus(payment.status);
    console.log("🔎 Normalized Status:", status);

    if (status === "success") {
      console.log("🟩 Payment success — redirecting to HOME");
      return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
    }

    console.log("🟠 Re-checking payment status from Monnify...");
    try {
      const verify = await payment_verify(paymentReference);
      console.log("🟩 Re-Verify Response:", verify);

      if (verify?.requestSuccessful && normalizeStatus(verify?.responseBody?.paymentStatus) === "success") {
        payment.status = "success";
        await payment.save();

        console.log("🟩 Updated payment to SUCCESS");
        return res.redirect(`${FRONTEND_URL}/index.html?paymentReference=${encodeURIComponent(paymentReference)}`);
      }
    } catch (err) {
      console.error("❌ Redirect verification failed:", err.message);
    }

    console.log("🟥 Final redirect = FAILED");
    return res.redirect(`${FRONTEND_URL}/game.html?failed=true&paymentReference=${encodeURIComponent(paymentReference)}`);
  } catch (err) {
    console.error("❌ Redirect fatal error:", err.message);
    return res.redirect(`${FRONTEND_URL}/game.html?failed=true`);
  }
};

// -------------------------------------------------------
// -------------------- Webhook Handler ------------------
// -------------------------------------------------------
exports.monnifyWebhook = async (req, res) => {
  try {
    console.log("\n============== 🔵 WEBHOOK RECEIVED 🔵 ==============");
    console.log("📥 Raw Webhook Body:", req.body);
    console.log("📥 Headers:", req.headers);

    const rawBody = req.body;
    const signatureHeader = req.headers["monnify-signature"];

    if (!signatureHeader) {
      console.log("❌ Missing signature header");
      return res.status(400).send("Missing signature");
    }

    const expectedSignature = crypto
      .createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    console.log("🔐 Expected Signature:", expectedSignature);
    console.log("🔐 Received Signature:", signatureHeader);

    if (expectedSignature !== signatureHeader) {
      console.log("❌ Webhook signature mismatch");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    console.log("🟣 Parsed Webhook Event:", event);

    const eventData = event.eventData;
    console.log("🟣 Webhook Event Data:", eventData);

    if (!eventData || !eventData.paymentReference) {
      return res.status(400).send("Missing paymentReference");
    }

    const { paymentReference, paymentStatus, amountPaid, metaData, paymentMethod } = eventData;
    const status = (paymentStatus || "").toUpperCase();

    console.log("🟣 Webhook: reference:", paymentReference, "status:", status);

    let payment = await Payment.findOne({ paymentReference });
    console.log("🔎 Existing Payment in DB:", payment);

    if (!payment) {
      console.log("🟠 Creating new Payment entry from webhook...");
      payment = await Payment.create({
        paymentReference,
        amountPaid: amountPaid || 0,
        status,
        metaData: { ...metaData, paymentMethod }
      });
    } else {
      console.log("🟡 Updating existing Payment...");
      payment.status = status;
      payment.amountPaid = amountPaid || payment.amountPaid;
      payment.metaData = { ...payment.metaData, paymentMethod, ...(metaData || {}) };
      await payment.save();
    }

    const isSuccessful = ["SUCCESS", "SUCCESSFUL", "PAID"].includes(status);

    if (isSuccessful && metaData?.selectedNumbers) {
      console.log("🟩 WEBHOOK: Successful payment — updating NumberCount");

      const selectedNumbers = Array.isArray(metaData.selectedNumbers)
        ? metaData.selectedNumbers.map(Number)
        : metaData.selectedNumbers.toString().split(",").map(Number);

      console.log("🔢 Webhook Selected Numbers:", selectedNumbers);

      for (const num of selectedNumbers) {
        const updated = await NumberCount.findOneAndUpdate(
          { eventValue: metaData.event, number: num },
          { $inc: { count: 1 }, $setOnInsert: { maxCount: 10 } },
          { upsert: true, new: true }
        );

        console.log("📌 Updated NumberCount:", updated);
      }

      if (metaData.playerEmail && metaData.playerName) {
        try {
          console.log("📧 Sending Winner Email...");
          await sendWinnerEmail(metaData.playerEmail, metaData.playerName, selectedNumbers, metaData.event);
          console.log("📧 Winner Email Sent!");
        } catch (err) {
          console.error("❌ Failed to send winner email:", err.message);
        }
      }
    }

    console.log("🟩 Webhook processing completed successfully");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err.stack || err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
