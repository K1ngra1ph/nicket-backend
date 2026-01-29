import axios from "axios";

export default async function sendPaymentEmail(email, name, amount, transactionId) {
  try {
    const response = await axios.post(
      "https://nicketonemail.zeabur.app/api/confirm-payment",
      { email, name, amount, transactionId },
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'x-nicket-key': 'savage2000savage2000'
        }
      }
    );
    return response.data.success;
  } catch (err) {
    console.error("[sendPaymentEmail] Error:", err.response?.data || err.message);
    return false;
  }
}
