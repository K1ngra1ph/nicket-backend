import axios from "axios";

const EMAIL_SERVICE_URL =
  process.env.EMAIL_SERVICE_URL ||
  "https://nicket-email-service.vercel.app/api/send-email";

const BACKEND_SECRET = process.env.BACKEND_SECRET;

export default async function sendEmail(payment) {
  try {
    if (!BACKEND_SECRET) {
      console.error("❌ Missing BACKEND_SECRET env variable!");
      return null;
    }

    const selectedNumbers = Array.isArray(payment.selectedNumbers)
      ? payment.selectedNumbers
      : payment.selectedNumbers
        ? [payment.selectedNumbers]
        : [];

    const payload = {
      name: payment.name || payment.fullName || "Nicket User",
      email: payment.email,
      phone: payment.phone,
      eventValue: payment.event || payment.eventValue,
      selectedNumbers,
      totalValue:
        payment.totalValue ||
        payment.amount ||
        payment.amountPaid ||
        0,
      paymentReference: payment.paymentReference
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
}
