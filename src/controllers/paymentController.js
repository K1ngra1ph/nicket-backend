const axios = require("axios");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const SelectedNumber = require("../models/SelectedNumber");
const { getMonnifyToken } = require("../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

/* ======================================================
   NORMALIZE SELECTED NUMBERS
====================================================== */
function normalizeSelectedNumbers(value) {
  console.log("🟦 [DEBUG] Raw selectedNumbers received:", value);

  if (!value) return [];

  if (Array.isArray(value)) {
    const nums = value.map(n => Number(n)).filter(n => !isNaN(n));
    console.log("🟦 [DEBUG] Array → normalized:", nums);
    return nums;
  }

  if (typeof value === "string") {
    const nums = value.split(",").map(n => Number(n)).filter(n => !isNaN(n));
    console.log("🟦 [DEBUG] String → normalized:", nums);
    return nums;
  }

  const num = [Number(value)].filter(n => !isNaN(n));
  console.log("🟦 [DEBUG] Single value → normalized:", num);
  return num;
}

/* ======================================================
   INITIATE PAYMENT
====================================================== */
exports.initiatePayment = async (req, res) => {
  try {
    console.log("🔵 [DEBUG] Incoming initiatePayment body:", req.body);

    let { amount, customerName, customerEmail, customerPhone, selectedNumbers, event } = req.body;
    selectedNumbers = normalizeSelectedNumbers(selectedNumbers);
    console.log("🔵 [DEBUG] Normalized selectedNumbers:", selectedNumbers);

    const token = await getMonnifyToken();
    console.log("🔵 [DEBUG] Retrieved Monnify token");

    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount,
      paymentReference,
      customerName,
      customerEmail,
      customerPhone,
      customerId: customerEmail,
      paymentDescription: `Nicket Payment - ${event}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: `${process.env.BACKEND_URL}/api/payments/redirect`,
      metaData: {
        event,
        playerName: customerName,
        playerEmail: customerEmail,
        selectedNumbers: selectedNumbers.join(","), // Monnify expects string
      }
    };

    console.log("💳 [DEBUG] Monnify INIT payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("💳 [DEBUG] Monnify INIT raw response:", response.data);

    if (!response.data.requestSuccessful) {
      console.log("❌ [DEBUG] Monnify returned requestSuccessful=false");
      return res.status(400).json({ message: "Monnify init failed", error: response.data });
    }

    const txnReference = response.data.responseBody.transactionReference;

    await Payment.create({
      paymentReference,
      transactionReference: txnReference,
      amount,
      amountPaid: 0,
      eventValue: event,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      status: "pending",
      metaData: { event, playerName: customerName, playerEmail: customerEmail, selectedNumbers, winner: false }
    });

    console.log("💾 [DEBUG] Payment saved in DB successfully");

    return res.json({
      success: true,
      checkoutUrl: response.data.responseBody.checkoutUrl,
      paymentReference,
      transactionReference: txnReference
    });

  } catch (err) {
    console.error("❌ [DEBUG] initiatePayment ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ======================================================
   VERIFY WITH MONNIFY
====================================================== */
async function verifyWithMonnify(transactionReference) {
  console.log("🟣 [DEBUG] Verifying transaction:", transactionReference);
  const token = await getMonnifyToken();
  const url = `${BASE_URL}/api/v2/transactions/${transactionReference}`;
  const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log("🟣 [DEBUG] Verification raw response:", response.data);
  return response.data;
}

/* ======================================================
   REDIRECT AFTER PAYMENT
====================================================== */
exports.redirectAfterPayment = async (req, res) => {
  try {
    console.log("🔵 [DEBUG] Redirect triggered:", req.query);
    const paymentReference = req.query.paymentReference;
    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      console.log("❌ [DEBUG] Payment not found");
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);
    }

    const verifyData = await verifyWithMonnify(payment.transactionReference);
    const status = verifyData.responseBody?.paymentStatus;
    console.log("🔵 [DEBUG] Redirect verification status:", status);

    if (status === "PAID") {
      payment.status = "successful";
      payment.amountPaid = verifyData.responseBody.amountPaid;
      await payment.save();
      console.log("✅ [DEBUG] Payment marked as successful");
      return res.redirect(`${process.env.FRONTEND_URL}/payment-success.html`);
    }

    console.log("❌ [DEBUG] Payment NOT PAID");
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);

  } catch (err) {
    console.error("❌ [DEBUG] redirectAfterPayment ERROR:", err.response?.data || err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);
  }
};

/* ======================================================
   MONNIFY WEBHOOK
====================================================== */
exports.monnifyWebhook = async (req, res) => {
  try {
    console.log("📩 [DEBUG] Webhook received");

    const rawBody = req.body;
    const signatureHeader = req.headers["monnify-signature"];
    if (!signatureHeader) return res.status(400).send("Missing signature");

    const expectedSignature = crypto.createHmac("sha512", process.env.MONNIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signatureHeader) return res.status(403).send("Invalid signature");

    const event = JSON.parse(rawBody.toString("utf8"));
    const eventData = event.eventData;
    if (!eventData?.paymentReference) return res.status(400).send("Missing paymentReference");

    const { paymentReference, paymentStatus, amountPaid, metaData } = eventData;
    console.log("📩 [DEBUG] Webhook data:", { paymentReference, paymentStatus, amountPaid });

    let payment = await Payment.findOne({ paymentReference });
    if (!payment) {
      payment = await Payment.create({
        paymentReference,
        amountPaid: amountPaid || 0,
        status: paymentStatus === "SUCCESSFUL" ? "successful" : "failed",
        metaData: metaData || {}
      });
    } else {
      payment.status = paymentStatus === "SUCCESSFUL" ? "successful" : "failed";
      payment.amountPaid = amountPaid || payment.amountPaid;
      await payment.save();
    }

    if (payment.status === "successful" && metaData?.selectedNumbers) {
      const numbers = Array.isArray(metaData.selectedNumbers)
        ? metaData.selectedNumbers
        : metaData.selectedNumbers.split(",").map(Number);

      console.log("📩 [DEBUG] Reserving numbers:", numbers);

      await SelectedNumber.insertMany(numbers.map(n => ({
        number: n,
        paymentReference,
        event: metaData.event,
        userEmail: metaData.playerEmail
      })));
    }

    res.status(200).send("OK");
    console.log("📩 [DEBUG] Webhook processed successfully");

  } catch (err) {
    console.error("❌ [DEBUG] monnifyWebhook ERROR:", err.stack || err.message);
    return res.status(500).send("Error");
  }
};

/* ======================================================
   VERIFY PAYMENT ENDPOINT
====================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentReference } = req.params;
    console.log("🟢 [DEBUG] verifyPayment for:", paymentReference);

    const payment = await Payment.findOne({ paymentReference });
    if (!payment) {
      console.log("❌ [DEBUG] Payment not found");
      return res.status(404).json({ message: "Not found" });
    }

    const verifyData = await verifyWithMonnify(payment.transactionReference);
    console.log("🟢 [DEBUG] verifyPayment response:", verifyData);

    return res.json(verifyData);
  } catch (err) {
    console.error("❌ [DEBUG] verifyPayment ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Verify error" });
  }
};