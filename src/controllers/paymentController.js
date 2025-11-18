const axios = require("axios");
const User = require("../models/User");
const Payment = require("../models/Payment");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

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

exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue, userId } = req.body;

    if (!name || !email || !phone || !amount || (!eventValue && !userId)) {
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
      redirectUrl: "https://nicket-lilac.vercel.app/verify.html",
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
      data: { checkoutUrl, paymentReference, apiKey: process.env.MONNIFY_API_KEY, contractCode: process.env.MONNIFY_CONTRACT_CODE },
    });
  } catch (error) {
    console.error("Payment init error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const transactionReference =
      (req.body.transactionReference ||
        req.query.transactionReference ||
        "").trim();

    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid transaction reference",
      });
    }

    const token = await getMonnifyToken();

    const response = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${transactionReference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const info = response.data.responseBody;

    if (!info || !info.paymentReference) {
      return res.status(500).json({
        success: false,
        error: "Monnify returned invalid transaction info",
        raw: response.data,
      });
    }

    const payment = await Payment.findOne({
      paymentReference: info.paymentReference
    });

    if (payment) {
      payment.amountPaid = info.amountPaid || 0;
      payment.status = info.paymentStatus || "unknown";
      payment.transactionReference = info.transactionReference;
      await payment.save();
    } else {
      await Payment.create({
        paymentReference: info.paymentReference,
        amountPaid: info.amountPaid || 0,
        status: info.paymentStatus || "unknown",
        transactionReference: info.transactionReference,
      });
    }

    console.log(
      `Payment ${info.paymentReference} verification:`,
      info.paymentStatus
    );

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
      "Verify Payment Error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};
