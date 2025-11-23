const axios = require("axios");
const Payment = require("../models/Payment");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

/**
 * Fetch Monnify API token
 */
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

/**
 * Initiate a payment
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue } = req.body;

    if (!name || !email || !phone || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount: Number(amount),
      customerName: name,
      customerEmail: email,
      customerPhoneNumber: phone,
      paymentReference,
      paymentDescription: eventValue
        ? `Nicket Payment - ${eventValue}`
        : "Wallet Funding",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: "https://nicket-lilac.vercel.app/verify", // must match frontend
    };

    const monnifyResponse = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const responseBody = monnifyResponse.data.responseBody;
    const checkoutUrl =
      responseBody?.checkoutUrl || responseBody?.checkout_url || null;

    // Save pending payment to DB
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
        checkoutUrl,
        paymentReference,
        apiKey: process.env.MONNIFY_API_KEY,
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
      },
    });
  } catch (error) {
    console.error(
      "Payment initiation error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Verify payment after redirect
 */
exports.verifyPayment = async (req, res) => {
  try {
    console.log("Incoming verify-payment body:", req.body);
    console.log("Incoming query params:", req.query);

    const transactionReference =
      (req.body.transactionReference || req.query.transactionReference || "").trim();

    console.log("Extracted transactionReference:", transactionReference);

    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid transaction reference",
      });
    }

    const token = await getMonnifyToken();

    const monnifyRes = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${transactionReference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const info = monnifyRes.data.responseBody;

    if (!info || !info.paymentReference) {
      console.error("Monnify returned invalid transaction info:", monnifyRes.data);
      return res.status(500).json({
        success: false,
        error: "Monnify returned invalid transaction info",
      });
    }

    // Update or create payment record
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

    console.log(`Payment ${info.paymentReference} verified with status:`, info.paymentStatus);

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
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};
