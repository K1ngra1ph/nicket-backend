const axios = require("axios");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { getMonnifyToken } = require("../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
  ? "https://api.monnify.com"
  : "https://sandbox.monnify.com";

exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue } = req.body;

    if (!name || !email || !phone || !amount || !eventValue)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/initiate`,
      {
        amount: Number(amount),
        customerFullName: name,
        customerEmail: email,
        customerPhoneNumber: phone,
        paymentReference,
        paymentDescription: `Payment for ${eventValue}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: "https://nicket-lilac.vercel.app/success.html",
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: response.data.responseBody,
    });

  } catch (error) {
    console.error("Payment init error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentReference } = res.body;

    if (!paymentReference) {
      return res.status(400).json({ success:false, error: "Missing payment reference" });
    }

    const token = await getMonnifyToken();

    const response = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/${paymentReference}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment verification successful",
      data: response.data.responseBody,
    });
  } catch (error) {
    console.log("Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};
