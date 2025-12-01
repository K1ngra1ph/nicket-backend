import axios from "axios";

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

/**
 * Retrieve Monnify Access Token
 * Uses API_KEY and SECRET_KEY encoded as Base64
 *
 * @returns {Promise<string>} Access Token
 */
export const getMonnifyToken = async () => {
  try {
    if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_SECRET_KEY) {
      throw new Error("Monnify API key or secret key not set in environment");
    }

    const credentials = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`;
    const encodedCredentials = Buffer.from(credentials).toString("base64");

    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      {},
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    const token =
      response?.data?.responseBody?.accessToken ||
      response?.data?.responseBody?.access_token ||
      null;

    if (!token || typeof token !== "string" || token.length < 10) {
      console.error("❌ Invalid token response:", response.data);
      throw new Error("Monnify returned an invalid token");
    }

    return token;
  } catch (err) {
    console.error(
      "❌ Failed to retrieve Monnify token:",
      err.response?.data || err.message || err
    );
    throw new Error("Failed to retrieve Monnify token");
  }
};
