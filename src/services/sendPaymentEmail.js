import axios from "axios";

export default async function sendPaymentEmail(email, name, amount, transactionId) {
  try {
    const response = await axios.post(
      "https://nicketonemail.vercel.app/api/confirm-payment",
      { email, name, amount, transactionId },
      { timeout: 10000 }
    );
    return response.data.success;
  } catch (err) {
    console.error("[sendPaymentEmail] Error:", err.message);
    return false;
  }
}
