import Payment from "../../models/Payment.js";
import verifyWithMonnify from "./verifyWithMonnify.js";
import sendEmail from "./sendEmail.js";

export default async function verifyPayment(req, res) {
  console.log("🔍 Incoming verify request:", req.params);

  try {
    const { paymentReference } = req.params;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Missing paymentReference"
      });
    }

    let payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    if (payment.status === 'successful') {
        return res.json({
            success: true,
            verified: true,
            paymentStatus: "PAID",
            amountPaid: payment.amountPaid,
            paymentReference,
            transactionReference: payment.transactionReference,
            metaData: payment.metaData,
            selectedNumbers: payment.selectedNumbers
        });
    }

    const result = await verifyWithMonnify(payment.transactionReference);

    if (!result || !result.ok) {
      return res.json({
        success: true, 
        verified: false,
        paymentStatus: "PENDING",
        paymentReference,
        metaData: payment.metaData
      });
    }

    const { responseBody } = result;
    const monnifyStatus = responseBody?.paymentStatus || "UNKNOWN";

    if (monnifyStatus === "PAID" || monnifyStatus === "SUCCESSFUL") {
      if (payment.status !== 'successful') {
          payment.status = 'successful';
          payment.amountPaid = responseBody?.amountPaid;
          await payment.save();
          
          console.log("📨 Verified new successful payment — sending email...");
          await sendEmail(payment);
      }
    }

    return res.json({
      success: true,
      verified: true,
      paymentStatus: monnifyStatus,
      amountPaid: responseBody?.amountPaid,
      paymentReference,
      transactionReference: payment.transactionReference,
      metaData: payment.metaData,
      selectedNumbers: payment.selectedNumbers
    });

  } catch (err) {
    console.error("❌ Unexpected verifyPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Verify error"
    });
  }
}