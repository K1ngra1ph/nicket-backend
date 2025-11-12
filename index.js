const admin = require("firebase-admin");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();
const app = express();

app.use(express.json());
app.use(cors({ origin: ["https://nicketvip.web.app"], credentials: true }));

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

async function getMonnifyToken() {
  const credentials = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_API_SECRET}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {}, {
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        Accept: "application/json",
      },
    });
    return response.data.responseBody.accessToken;
  } catch (error) {
    console.error("Monnify token error:", error.response?.data || error.message);
    throw new Error("Failed to get Monnify token");
  }
}

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("🔥 Nicket Backend running on Vercel Successfully!");
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, eventValue } = req.body;
    if (!name || !email || !phone || !eventValue) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await db.collection("users").doc(email).set({
      name, email, phone, eventValue, createdAt: Date.now(),
    });
    res.status(200).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/initiate-payment", async (req, res) => {
  try {
    const { name, email, phone, amount, eventValue } = req.body;
    if (!name || !email || !phone || !amount || !eventValue) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

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
        paymentDescription: `Payment for winning ticket for ${eventValue}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: "https://nicketvip.web.app/success",
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
});

app.post("/verify-payment", async (req, res) => {
  const { paymentReference, email } = req.body;
  if (!paymentReference || !email) {
    return res.status(400).json({ success: false, error: "Payment reference and email required" });
  }

  try {
    const token = await getMonnifyToken();
    const response = await axios.get(
      `${BASE_URL}/api/v1/merchant/transactions/query?paymentReference=${encodeURIComponent(paymentReference)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const result = response.data;
    if (!result.requestSuccessful || result.responseBody.paymentStatus !== "PAID") {
      return res.status(400).json({ success: false, error: "Payment not successful" });
    }

    await db.collection("payments").doc(paymentReference).set(result.responseBody);

    const userDoc = await db.collection("users").doc(email).get();
    if (!userDoc.exists) {
      return res.status(400).json({ success: false, error: "User not found" });
    }
    const userData = userDoc.data();

    const mailOptions = {
      from: `"NICKET VIP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🎟️ WIN Free VIP Ticket to: ${userData.eventValue}`,
      html: `
        <h3>Hi ${userData.name},</h3>
        <p>Thanks for participating in our games! Your chance to win a VIP Ticket to <strong>${userData.eventValue}</strong> is closer than you think. Watch the draw live on YouTube!</p>
        <p><strong>Phone:</strong> ${userData.phone}</p>
        <p>See you at the event! — <strong>Nicket Team</strong></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Payment verified and email sent successfully", data: result.responseBody });
  } catch (error) {
    console.error("Payment verification or email failed:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
