// controllers/payment/verifyWithMonnify.js

const axios = require("axios");
const { getMonnifyToken } = require("../../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

module.exports = async function verifyWithMonnify(transactionReference) {
  console.log("🟣 [DEBUG] Verifying transaction:", transactionReference);

  try {
    const token = await getMonnifyToken();

    const url = `${BASE_URL}/api/v2/transactions/${encodeURIComponent(
      transactionReference
    )}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("🟣 [DEBUG] Verification response:", response.data);

    return {
      ok: true,
      ...response.data
    };
  } catch (err) {
    // Monnify returns 400 if transaction not found or not paid yet
    const status = err.response?.status || 500;
    const data = err.response?.data || null;

    console.warn("⚠️ [DEBUG] Monnify verification failed:", status, data);

    return {
      ok: false,
      status,
      data,
      message:
        status === 400
          ? "Transaction not paid yet or not found"
          : "Verification failed"
    };
  }
};
