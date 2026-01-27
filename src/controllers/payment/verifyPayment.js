import Payment from "../../models/Payment.js";
import Event from "../../models/Event.js";
import verifyWithMonnify from "./verifyWithMonnify.js";
import sendEmail from "./sendEmail.js";

export default async function verifyPayment(req, res) {
  try {
    const { paymentReference } = req.params;
    let payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Ticket record not found" });
    }

    const event = await Event.findById(payment.eventValue);
    const standardizedMetadata = payment.metadata || payment.metaData || {};
    const sendResponse = (p, e) => {
      res.json({
        success: true,
        status: p.status.toLowerCase(),
        paymentStatus: p.status.toUpperCase(),
        name: p.name,
        eventName: p.eventName || e?.name || "Nicket Entry",
        paymentReference: p.paymentReference,
        amountPaid: p.amountPaid,
        selectedNumbers: p.selectedNumbers || [],
        metadata: standardizedMetadata,
        eventDetails: { drawStatus: e?.drawStatus || 'open' }
      });
    };

    if (payment.status === 'successful' || payment.status === 'PAID') {
        return sendResponse(payment, event);
    }

    const result = await verifyWithMonnify(payment.transactionReference);

    if (result && result.ok) {
      const monnifyStatus = (result.responseBody?.paymentStatus || "").toUpperCase();
      
      if (monnifyStatus === "PAID" || monnifyStatus === "SUCCESSFUL") {
          payment.status = 'successful';
          payment.amountPaid = result.responseBody?.amountPaid;
          await payment.save();

          sendEmail(payment).catch(e => console.error("Email delayed:", e.message));
          
          return sendResponse(payment, event);
      }
    }

    return sendResponse(payment, event);

  } catch (err) {
    console.error("Critical Verify Error:", err);
    return res.status(500).json({ success: false, message: "Server Verification Error" });
  }
}
