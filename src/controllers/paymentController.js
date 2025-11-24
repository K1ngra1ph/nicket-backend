const axios = require("axios");
const Payment = require("../models/Payment");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

// ----------------------------------------------------
// GET MONNIFY AUTH TOKEN
// ----------------------------------------------------
async function getMonnifyToken() {
  try {
    console.log("[DEBUG] Requesting Monnify Token...");

    const auth = Buffer.from(
      `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
    ).toString("base64");

    const res = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      {},
      { headers: { Authorization: `Basic ${auth}` } }
    );

    console.log("[DEBUG] Token response received:", res.data);

    return res.data.responseBody.accessToken;
  } catch (err) {
    console.error("[ERROR] Token Error:", err.response?.data || err.message);
    throw new Error("Failed to get Monnify token");
  }
}

// ----------------------------------------------------
// INITIATE PAYMENT
// ----------------------------------------------------
exports.initiatePayment = async (req, res) => {
  try {
    console.log("[DEBUG] Initiate Payment Request Body:", req.body);

    const { name, email, phone, amount, eventValue } = req.body;

    if (!name || !email || !phone || !amount) {
      console.warn("[DEBUG] Missing required fields:", req.body);
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount: Math.floor(Number(amount)),
      currency: "NGN",
      paymentReference,
      customerFullName: name,
      customerEmail: email,
      customerPhoneNumber: phone,
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      paymentDescription: eventValue
        ? `Nicket Payment - ${eventValue}`
        : "Wallet Funding",
      redirectUrl: "https://nicket-lilac.vercel.app/game.html",
      metaData: {
        event: eventValue || "Wallet Funding",
        playerName: name,
        playerEmail: email,
        selectedNumbers: Array.isArray(req.body.selectedNumbers)
          ? req.body.selectedNumbers.join(",")
          : "",
      },
    };

    console.log("[DEBUG] Monnify Init Payload:", payload);

    const monnifyResponse = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    console.log("[DEBUG] Monnify Init Response:", monnifyResponse.data);

    const responseBody = monnifyResponse.data.responseBody;

    await Payment.create({
      paymentReference,
      amount,
      eventValue: eventValue || "Wallet Funding",
      name,
      email,
      phone,
      status: "pending",
    });

    console.log("[DEBUG] Saved payment to DB:", paymentReference);

    return res.json({
      success: true,
      data: {
        checkoutUrl: responseBody?.checkoutUrl || responseBody?.checkout_url,
        apiKey: process.env.MONNIFY_API_KEY,
        paymentReference,
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        isTestMode: process.env.MONNIFY_MODE !== "LIVE",
      },
    });
  } catch (error) {
    console.error("[ERROR] Payment initiation error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

// ----------------------------------------------------
// VERIFY PAYMENT
// ----------------------------------------------------
exports.verifyPayment = async (req, res) => {
  try {
    console.log("[DEBUG] Verify Payment Request Body:", req.body);
    console.log("[DEBUG] Verify Payment Query Params:", req.query);

    const transactionReference =
      (req.body.transactionReference || req.query.transactionReference || "").trim();

    if (!transactionReference) {
      console.warn("[DEBUG] Missing transaction reference.");
      return res.status(400).json({ success: false, error: "Missing or invalid transaction reference" });
    }

    const token = await getMonnifyToken();

    console.log("[DEBUG] Calling Monnify verify for:", transactionReference);

    const monnifyRes = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${transactionReference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("[DEBUG] Monnify Verify Response:", monnifyRes.data);

    const info = monnifyRes.data.responseBody;

    if (!info || !info.paymentReference) {
      console.error("[ERROR] Invalid transaction info from Monnify:", info);
      return res.status(500).json({ success: false, error: "Monnify returned invalid transaction info" });
    }

    let payment = await Payment.findOne({ paymentReference: info.paymentReference });

    if (payment) {
      console.log("[DEBUG] Updating existing payment:", info.paymentReference);
      payment.amountPaid = info.amountPaid || 0;
      payment.status = info.paymentStatus || "unknown";
      payment.transactionReference = info.transactionReference;
      await payment.save();
    } else {
      console.log("[DEBUG] Creating new payment record:", info.paymentReference);
      payment = await Payment.create({
        paymentReference: info.paymentReference,
        amountPaid: info.amountPaid || 0,
        status: info.paymentStatus || "unknown",
        transactionReference: info.transactionReference,
      });
    }

    return res.json({
      success: true,
      data: {
        paymentReference: info.paymentReference,
        amountPaid: info.amountPaid,
        status: info.paymentStatus,
        transactionReference: info.transactionReference,
      },
    });
  } catch (error) {
    console.error("[ERROR] Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};
