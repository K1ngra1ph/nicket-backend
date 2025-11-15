const axios = require("axios");
const Payment = require("../models/Payment");
const { getMonnifyToken } = require("../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

// 🚀 INITIATE PAYMENT (CLEAN + WORKING)
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue } = req.body;

    if (!name || !email || !phone || !amount || !eventValue) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const token = await getMonnifyToken();
    if (!token) {
      return res.status(500).json({ success: false, error: "Monnify token error" });
    }

    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount: Number(amount),
      customerName: name,
      customerEmail: email,
      customerPhoneNumber: phone,
      paymentReference,
      paymentDescription: `Nicket Payment - ${eventValue}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: "https://nicket-lilac.vercel.app/verify.html"
    };

    const monnifyResponse = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const responseBody = monnifyResponse.data.responseBody;

    // ✔ FIXED — checkoutUrl properly extracted
    const checkoutUrl =
      responseBody?.checkoutUrl ||
      responseBody?.checkout_url ||
      null;

    if (!checkoutUrl) {
      return res.status(500).json({
        success: false,
        error: "Monnify did not return checkoutUrl",
        raw: responseBody
      });
    }

    // Save payment
    await Payment.create({
      paymentReference,
      amount,
      eventValue,
      name,
      email,
      phone,
      status: "pending"
    });

    return res.json({
      success: true,
      data: {
        checkoutUrl,
        paymentReference
      }
    });

  } catch (error) {
    console.error("Payment init error:", error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};


// 🚀 VERIFY PAYMENT
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentReference } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        error: "Missing payment reference"
      });
    }

    const token = await getMonnifyToken();
    if (!token) {
      return res.status(500).json({
        success: false,
        error: "Monnify token error"
      });
    }

    const response = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${paymentReference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const info = response.data.responseBody;

    // Update DB status
    await Payment.findOneAndUpdate(
      { paymentReference },
      {
        status: info.paymentStatus || "unknown",
        transactionReference: info.transactionReference
      }
    );

    return res.json({
      success: true,
      message: "Payment verification successful",
      data: info
    });

  } catch (error) {
    console.error("Verify error:", error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};
