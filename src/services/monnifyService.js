const axios = require("axios");

const BASE_URL =
  process.env.MONNIFY_MODE === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

exports.getMonnifyToken = async () => {
  const credentials = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_API_SECRET}`;
  const encoded = Buffer.from(credentials).toString("base64");

  const response = await axios.post(
    `${BASE_URL}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${encoded}` } }
  );
  return response.data.responseBody.accessToken;
};