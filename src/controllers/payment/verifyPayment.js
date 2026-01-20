import Payment from "../../models/Payment.js";
import Event from "../../models/Event.js";
import verifyWithMonnify from "./verifyWithMonnify.js";
import sendEmail from "./sendEmail.js";

export default async function verifyPayment(req, res) {
  try {
    const { paymentReference } = req.params;
    let payment = await Payment.findOne({ paymentReference });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const event = await Event.findById(payment.eventValue);
    
    const getResponseData = (p, e) => ({
      success: true,
      status: p.status,
      name: p.name,
      eventName: p.eventName,
      paymentReference: p.paymentReference,
      selectedNumbers: p.selectedNumbers || [],
      metadata: p.metadata || p.metaData || { winner: false },
      eventDetails: { 
        drawStatus: e?.drawStatus || 'open' 
      }
    });

    if (p.status === 'successful' || p.status === 'PAID') {
        return res.json(getResponseData(payment, event));
    }

    const result = await verifyWithMonnify(payment.transactionReference);

    if (result && result.ok) {
      const monnifyStatus = (result.responseBody?.paymentStatus || "").toUpperCase();
      
      if (monnifyStatus === "PAID" || monnifyStatus === "SUCCESSFUL") {
          payment.status = 'successful';
          payment.amountPaid = result.responseBody?.amountPaid;
          await payment.save();
          sendEmail(payment).catch(e => console.error("Email fail:", e));
      }
    }

    return res.json(getResponseData(payment, event));

  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}