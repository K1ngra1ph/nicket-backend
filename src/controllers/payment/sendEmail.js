import axios from "axios";

const EMAIL_SERVICE_URL = "https://nicketonemail.zeabur.app/api/confirm-payment";
const INTERNAL_SECRET_KEY = "savage2000savage2000";

export default async function sendEmail(payment) {
  try {
    const payload = {
      name: payment.name || payment.fullName || "Nicket User",
      email: payment.email,
      amount: payment.totalValue || payment.amount || payment.amountPaid || 0,
      transactionId: payment.paymentReference || "N/A",
      currency: payment.currency || "₦", 
      selectedNumbers: payment.selectedNumbers || []
    };

    console.log("📨 Sending updated payload to Zeabur:", payload);

    const res = await axios.post(
      EMAIL_SERVICE_URL,
      payload,
      {
        headers: {
          "x-nicket-key": INTERNAL_SECRET_KEY,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log("✅ Email service response:", res.data);
    return res.data;

  } catch (err) {
    console.error("❌ Email sending failed:", err.response?.data || err.message);
    return null;
  }
}
