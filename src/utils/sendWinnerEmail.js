// src/utils/sendWinnerEmail.js
const axios = require("axios");

/**
 * Sends a winner email via your Vercel email service.
 *
 * @param {string} email - Winner's email
 * @param {string} name - Winner's name
 * @param {Array<number>} numbers - Selected numbers
 * @param {string} event - Event name
 * @returns {Promise<boolean>}
 */
async function sendWinnerEmail(email, name, numbers, event) {
  if (!email || !name || !numbers || !event) {
    throw new Error("[sendWinnerEmail] Missing required parameters");
  }

  if (!Array.isArray(numbers) || numbers.length === 0 || !numbers.every(n => Number.isInteger(n))) {
    throw new Error("[sendWinnerEmail] `numbers` must be a non-empty array of integers");
  }

  try {
    const payload = { email, name, numbers, event };
    const response = await axios.post(
      "https://nicket-email-service.vercel.app/api/send-winner",
      payload,
      { timeout: 10000 }
    );

    if (response.status !== 200 || response.data?.success !== true) {
      console.error(`[sendWinnerEmail] Failed to send email to ${email}`, response.data || `Status ${response.status}`);
      throw new Error("Email service responded with an error");
    }

    console.log(`[sendWinnerEmail] Winner email sent to ${email} for event "${event}"`);
    return true;
  } catch (err) {
    console.error(`[sendWinnerEmail] Error sending winner email to ${email}:`, err.response?.data || err.message || err);
    throw err;
  }
}

module.exports = sendWinnerEmail;