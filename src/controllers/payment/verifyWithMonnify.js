// controllers/payment/verifyWithMonnify.js
const axios = require("axios");
const { getMonnifyToken } = require("../../services/monnifyService");

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

module.exports = async function verifyWithMonnify(transactionReference) {
  console.log("🟣 [DEBUG] Verifying transaction:", transactionReference);

  const token = await getMonnifyToken();
  const url = `${BASE_URL}/api/v2/transactions/${transactionReference}`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("🟣 [DEBUG] Verification response:", response.data);

  return response.data;
};
