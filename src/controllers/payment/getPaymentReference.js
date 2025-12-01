import Payment from "../../models/Payment.js";

export default async function getPaymentReference(req, res) {
  console.log("🔍 Debug: Incoming query params:", req.query);

  const { transactionReference } = req.query;

  console.log("🔍 Debug: Extracted transactionReference:", transactionReference);

  const payment = await Payment.findOne({ transactionReference }).catch(err => {
    console.error("❌ Debug: Error while querying Payment:", err);
    return null;
  });

  console.log("🔍 Debug: Payment query result:", payment);

  if (!payment) {
    console.log("⚠️ Debug: No payment found for transactionReference:", transactionReference);
    return res.status(404).json({ paymentReference: null });
  }

  console.log("✅ Debug: Returning paymentReference:", payment.paymentReference);

  return res.json({ paymentReference: payment.paymentReference });
}
