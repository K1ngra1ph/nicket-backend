const axios = require("axios");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { getMonnifyToken } = require("../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Initialize Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue } = req.body;

    if (!name || !email || !phone || !amount || !eventValue)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      {
        amount: Number(amount),
        customerName: name,
        customerEmail: email,
        customerPhoneNumber: phone,
        paymentReference,
        paymentDescription: `Payment for ${eventValue}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: "https://nicket-lilac.vercel.app/success",
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: response.data.responseBody,
    });
  } catch (error) {
    console.error("Payment init error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Verify Payment
exports.verifyPayment = async (req, res) => {
  const { paymentReference, email } = req.body;

  if (!paymentReference || !email)
    return res.status(400).json({ success: false, error: "Missing payment reference or email" });

  try {
    const token = await getMonnifyToken();
    const response = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/query?paymentReference=${encodeURIComponent(
        paymentReference
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const result = response.data;
    if (!result.requestSuccessful || result.responseBody.paymentStatus !== "PAID")
      return res.status(400).json({ success: false, error: "Payment not successful" });

    await Payment.create(result.responseBody);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const mailOptions = {
      from: `"NICKET VIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🎟️ WIN Free VIP Ticket to: ${user.eventValue}`,
      html: `
        <h3>Hi ${user.name},</h3>
        <p>Thanks for participating! Your payment for <strong>${user.eventValue}</strong> was successful.</p>
        <p>Watch the live draw on YouTube!</p>
        <p><strong>Nicket Team</strong></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Payment verified and email sent" });
  } catch (error) {
    console.error("Payment verify error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};