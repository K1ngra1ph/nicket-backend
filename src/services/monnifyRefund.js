import axios from "axios";
import { getMonnifyToken } from "./monnifyService.js";

export default async function initiateMonnifyRefund(transactionReference, amount, reason) {
  const token = await getMonnifyToken();
  const BASE_URL = process.env.MONNIFY_MODE === "LIVE" ? "https://api.monnify.com" : "https://sandbox.monnify.com";

  try {
    const response = await axios.post(`${BASE_URL}/api/v1/refunds/initiate`, {
      transactionReference,
      refundReference: `REFUND-${Date.now()}`,
      amount,
      refundReason: reason,
      customerNote: "Refund from Nicket Admin"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return response.data;
  } catch (err) {
    console.error("Monnify API Refund Error:", err.response?.data || err.message);
    throw new Error("Bank refused refund request");
  }
}