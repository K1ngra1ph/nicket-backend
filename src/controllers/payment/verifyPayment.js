const Payment = require("../../models/Payment");
const verifyWithMonnify = require("./verifyWithMonnify");
const sendEmail = require("./sendEmail");

module.exports = async function verifyPayment(req, res) {
  console.log("🔍 Incoming verify request:", req.params);

  try {
    const { paymentReference } = req.params;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Missing paymentReference"
      });
    }

    const payment = await Payment.findOne({ paymentReference });

    console.log("🔍 Payment DB lookup:", payment);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    // --- Verify with Monnify ---
    const result = await verifyWithMonnify(payment.transactionReference);

    console.log("🔍 Monnify verify result:", result);

    // No response protection
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Verification failed",
        status: "UNKNOWN"
      });
    }

    // Not paid yet (Monnify pending)
    if (!result.ok) {
      return res.json({
        success: true,
        verified: false,
        paymentStatus: "PENDING",
        paymentReference,
        transactionReference: payment.transactionReference,
        monnifyStatus: result.status,
        monnifyMessage: result.message
      });
    }

    const { responseBody } = result;
    const paymentStatus = responseBody?.paymentStatus || "UNKNOWN";

    // 🎉 SEND EMAIL AFTER SUCCESSFUL PAYMENT
    if (paymentStatus === "PAID" || paymentStatus === "SUCCESSFUL") {
      console.log("📨 Verified successful payment — sending email...");
      await sendEmail(payment);   // <── THIS IS THE CORRECT PLACE
    }

    // Respond back to frontend
    return res.json({
      success: true,
      verified: true,
      paymentStatus,
      amountPaid: responseBody?.amountPaid,
      paymentReference,
      transactionReference: payment.transactionReference,
      raw: result
    });

  } catch (err) {
    console.error("❌ Unexpected verifyPayment error:", err);

    return res.status(500).json({
      success: false,
      message: "Verify error"
    });
  }
};
