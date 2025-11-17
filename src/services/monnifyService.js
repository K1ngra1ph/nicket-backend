const axios = require("axios");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

exports.getMonnifyToken = async () => {
  try {
    const credentials = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`;
    const encoded = Buffer.from(credentials).toString("base64");

    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      {},
      {
        headers: { Authorization: `Basic ${encoded}` },
        timeout: 10000,
      }
    );

    const token = response.data.responseBody.accessToken;
    if (!token) throw new Error("No token received from Monnify");

    return token;
  } catch (err) {
    console.error("❌ Monnify token error:", err.response?.data || err.message);
    throw new Error("Failed to get Monnify token");
  }
};
