const axios = require("axios");

// ENVIRONMENT VARIABLES (define in Render)
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || "https://nicket-email-service.vercel.app/api/send-email";
const BACKEND_SECRET = process.env.BACKEND_SECRET;

module.exports = async function sendEmail(payment) {
  try {
    if (!BACKEND_SECRET) {
      console.error("❌ Missing BACKEND_SECRET env variable!");
      return null;
    }

    const payload = {
      name: payment.name,
      email: payment.email,
      phone: payment.phone,
      eventValue: payment.eventValue,
      selectedNumbers: payment.selectedNumbers,
      totalValue: payment.totalValue
    };

    console.log("📨 Sending email payload to Vercel:", payload);

    const res = await axios.post(
      EMAIL_SERVICE_URL,
      payload,
      {
        headers: {
          Authorization: `Bearer ${BACKEND_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Email service response:", res.data);
    return res.data;

  } catch (err) {
    console.error("❌ Email sending failed:", err.response?.data || err.message);
    return null;
  }
};
