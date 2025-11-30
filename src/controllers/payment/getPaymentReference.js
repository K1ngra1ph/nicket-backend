const Payment = require("../../models/Payment");

module.exports = async function getPaymentReference(req, res) {
  const { transactionReference } = req.query;

  const payment = await Payment.findOne({ transactionReference });

  if (!payment) return res.status(404).json({ paymentReference: null });

  return res.json({ paymentReference: payment.paymentReference });
};
