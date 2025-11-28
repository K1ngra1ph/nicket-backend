const axios = require("axios");
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

    let {
      amount,
      customerName,
      customerEmail,
      customerPhone,
      selectedNumbers,
      event
    } = req.body;

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
        selectedNumbers: selectedNumbers.join(","), // KEEPING YOUR REQUEST
      }
    };

    console.log("💳 [DEBUG] Monnify INIT payload:", JSON.stringify(payload, null, 2));

    // Send Init Transaction request
    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("💳 [DEBUG] Monnify INIT raw response:", response.data);

    if (!response.data.requestSuccessful) {
      console.log("❌ [DEBUG] Monnify returned requestSuccessful=false");
      return res.status(400).json({
        message: "Monnify init failed",
        error: response.data
      });
    }

    const txnReference = response.data.responseBody.transactionReference;
    console.log("💳 [DEBUG] Monnify Transaction Reference:", txnReference);

    // SAVE TRANSACTION
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
      metaData: {
        event,
        playerName: customerName,
        playerEmail: customerEmail,
        selectedNumbers, // KEEPING ARRAY IN DB
        winner: false
      }
    });

    console.log("💾 [DEBUG] Payment saved in DB successfully");

    return res.json({
      success: true,
      checkoutUrl: response.data.responseBody.checkoutUrl,
      paymentReference,
      transactionReference: txnReference
    });

  } catch (err) {
    console.error("❌ [DEBUG] Initiate Payment ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ======================================================
   VERIFY WITH MONNIFY V2
====================================================== */
async function verifyWithMonnify(transactionReference) {
  console.log("🟣 [DEBUG] Verifying transaction:", transactionReference);

  const token = await getMonnifyToken();

  const url = `${BASE_URL}/api/v2/transactions/${transactionReference}`;
  console.log("🟣 [DEBUG] Verification URL:", url);

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

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
      console.log("❌ [DEBUG] Payment not found in DB");
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);
    }

    console.log("🔵 [DEBUG] Found payment in DB:", payment);

    const verifyData = await verifyWithMonnify(payment.transactionReference);

    const status = verifyData.responseBody?.paymentStatus;
    console.log("🔵 [DEBUG] Redirect verification status:", status);

    if (status === "PAID") {
      payment.status = "paid";
      payment.amountPaid = verifyData.responseBody.amountPaid;
      await payment.save();

      console.log("✅ [DEBUG] Payment marked as PAID, redirecting...");
      return res.redirect(`${process.env.FRONTEND_URL}/payment-success.html`);
    }

    console.log("❌ [DEBUG] Payment NOT PAID, redirecting failure...");
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);

  } catch (err) {
    console.error("❌ [DEBUG] Redirect ERROR:", err.response?.data || err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed.html`);
  }
};

/* ======================================================
   WEBHOOK
====================================================== */
exports.webhook = async (req, res) => {
  try {
    console.log("📩 [DEBUG] Webhook incoming data:", req.body);

    const data = req.body;
    const paymentReference = data.paymentReference;
    const status = data.paymentStatus;

    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      console.log("❌ [DEBUG] Webhook payment not found");
      return res.status(404).send("Payment not found");
    }

    console.log("📩 [DEBUG] Webhook payment found:", payment);

    if (status === "PAID") {
      payment.status = "paid";
      payment.amountPaid = data.amountPaid;
      await payment.save();

      const numbers = normalizeSelectedNumbers(payment.metaData.selectedNumbers);

      console.log("📩 [DEBUG] Reserving numbers for user:", numbers);

      await SelectedNumber.insertMany(
        numbers.map(n => ({
          number: n,
          paymentReference,
          event: payment.eventValue,
          userEmail: payment.email
        }))
      );
    }

    console.log("📩 [DEBUG] Webhook processed OK");
    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ [DEBUG] Webhook ERROR:", err.message);
    return res.status(500).send("Error");
  }
};

/* ======================================================
   PUBLIC VERIFY ENDPOINT
====================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentReference } = req.params;

    console.log("🟢 [DEBUG] Checking verifyPayment for:", paymentReference);

    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      console.log("❌ [DEBUG] Payment not found");
      return res.status(404).json({ message: "Not found" });
    }

    const verifyData = await verifyWithMonnify(payment.transactionReference);

    console.log("🟢 [DEBUG] Final verify data:", verifyData);

    return res.json(verifyData);

  } catch (err) {
    console.error("❌ [DEBUG] Verify endpoint ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Verify error" });
  }
};