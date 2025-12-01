import axios from "axios";
import Payment from "../../models/Payment.js";
import normalizeNumbers from "./normalizeSelectedNumbers.js";
import { getMonnifyToken } from "../../services/monnifyService.js";

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

export default async function initiatePayment(req, res) {
  try {
    console.log("🔵 [DEBUG] Incoming initiatePayment body:", req.body);

    const { amount, name, email, phone, selectedNumbers, eventValue } = req.body;

    const numbers = normalizeNumbers(selectedNumbers);
    console.log("🔵 [DEBUG] Normalized selectedNumbers:", numbers);

    const token = await getMonnifyToken();
    console.log("🔵 [DEBUG] Retrieved Monnify token");

    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount,
      paymentReference,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerId: email,
      paymentDescription: `Nicket Payment - ${eventValue}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: `${process.env.BACKEND_URL}/api/payments/redirect`,
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: numbers.join(","),
      }
    };

    console.log("💳 [DEBUG] Monnify INIT Payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("💳 [DEBUG] Monnify INIT Response:", response.data);

    if (!response.data.requestSuccessful) {
      return res.status(400).json({
        message: "Monnify init failed",
        error: response.data
      });
    }

    const txnRef = response.data.responseBody.transactionReference;

    await Payment.create({
      paymentReference,
      transactionReference: txnRef,
      amount,
      amountPaid: 0,
      eventValue,
      name,
      email,
      phone,
      status: "pending",
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: numbers,
        winner: false
      }
    });

    return res.json({
      success: true,
      checkoutUrl: response.data.responseBody.checkoutUrl,
      paymentReference,
      transactionReference: txnRef
    });

  } catch (err) {
    console.error("❌ [DEBUG] initiatePayment ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "Server error" });
  }
}
