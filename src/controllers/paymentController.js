const axios = require("axios");
const Payment = require("../models/Payment");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

// Get Monnify Auth Token
async function getMonnifyToken() {
  try {
    const auth = Buffer.from(
      `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
    ).toString("base64");

    const res = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      {},
      { headers: { Authorization: `Basic ${auth}` } }
    );

    return res.data.responseBody.accessToken;
  } catch (err) {
    console.error("Token Error:", err.response?.data || err.message);
    throw new Error("Failed to get Monnify token");
  }
}

// Initiate Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, selectedNumbers } = req.body;

    if (!name || !email || !phone || !amount) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    // Payload exactly as Monnify expects
    const payload = {
      amount: Math.floor(Number(amount)), // must be integer
      currency: "NGN",
      paymentReference,
      customerFullName: name,
      customerEmail: email,
      customerPhoneNumber: phone,
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      paymentDescription: eventValue
        ? `Nicket Payment - ${eventValue}`
        : "Wallet Funding",
      redirectUrl: "https://nicket-lilac.vercel.app/game",
      metaData: {
        event: eventValue || "Wallet Funding",
        playerName: name,
        playerEmail: email,
        selectedNumbers: Array.isArray(req.body.selectedNumbers)
         ? req.body.selectedNumbers.join(",")
         : "",
      },
    };

    const monnifyResponse = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const responseBody = monnifyResponse.data.responseBody;

    // Save to DB
    await Payment.create({
      paymentReference,
      amount,
      eventValue: eventValue || "Wallet Funding",
      name,
      email,
      phone,
      status: "pending",
    });

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
    console.error("Payment initiation error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

// Verify Payment
exports.verifyPayment = async (req, res) => {
  try {
    const transactionReference = (req.body.transactionReference || req.query.transactionReference || "").trim();

    if (!transactionReference) {
      return res.status(400).json({ success: false, error: "Missing or invalid transaction reference" });
    }

    const token = await getMonnifyToken();

    const monnifyRes = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${transactionReference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const info = monnifyRes.data.responseBody;

    if (!info || !info.paymentReference) {
      return res.status(500).json({ success: false, error: "Monnify returned invalid transaction info" });
    }

    let payment = await Payment.findOne({ paymentReference: info.paymentReference });

    if (payment) {
      payment.amountPaid = info.amountPaid || 0;
      payment.status = info.paymentStatus || "unknown";
      payment.transactionReference = info.transactionReference;
      await payment.save();
    } else {
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
    console.error("Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
};