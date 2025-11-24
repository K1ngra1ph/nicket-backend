const axios = require("axios");

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

/**
 * Get Monnify access token
 * @returns {Promise<string>} Access token string
 * @throws Error if token cannot be retrieved
 */
exports.getMonnifyToken = async () => {
  try {
    // Encode API key and secret
    const credentials = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`;
    const encodedCredentials = Buffer.from(credentials).toString("base64");

    // Request token from Monnify
    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      {},
      {
        headers: { Authorization: `Basic ${encodedCredentials}` },
        timeout: 10000,
      }
    );

    const token = response.data?.responseBody?.accessToken;

    if (!token || typeof token !== "string") {
      throw new Error("No valid token received from Monnify");
    }

    return token;
  } catch (err) {
    console.error(
      "❌ Monnify token retrieval error:",
      err.response?.data || err.stack || err.message
    );
    throw new Error("Failed to retrieve Monnify token");
  }
};