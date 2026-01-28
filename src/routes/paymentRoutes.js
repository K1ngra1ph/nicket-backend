import express from "express";
import Payment from "../models/Payment.js";
import Event from "../models/Event.js";
import initiatePayment from "../controllers/payment/initiatePayment.js";
import verifyPayment from "../controllers/payment/verifyPayment.js";
import redirectAfterPayment from "../controllers/payment/redirectAfterPayment.js";
import getPaymentReference from "../controllers/payment/getPaymentReference.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import initiateMonnifyRefund from "../services/monnifyRefund.js";

const router = express.Router();

router.post("/initiate-payment", initiatePayment);
router.get("/verify/:paymentReference", verifyPayment);
router.get("/redirect", redirectAfterPayment);
router.get("/get-payment-reference", getPaymentReference);

router.get("/recent-winners", async (req, res) => {
  try {
    const winners = await Payment.find({
      status: { $in: ["successful", "PAID"] },
      "metadata.winner": true
    })
      .sort({ updatedAt: -1 })
      .limit(16)
      .select("name eventName paymentReference");

    res.json(winners);
  } catch (err) {
    res.status(500).json({ message: "Error fetching winners wall data" });
  }
});

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/refund", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "refunded") {
      return res.status(400).json({ message: "Payment already refunded" });
    }

    const event = await Event.findById(payment.eventValue);
    if (event?.drawStatus === "drawn") {
      return res.status(400).json({
        message: "Refund denied: Raffle draw has already been executed for this event."
      });
    }

    await initiateMonnifyRefund(
      payment.transactionReference,
      payment.amountPaid,
      "Admin refund request"
    );

    payment.status = "refunded";
    await payment.save();

    res.json({
      message: "Money returned successfully",
      payment
    });

  } catch (err) {
    res.status(500).json({
      message: err.message || "Internal refund processing error"
    });
  }
});

export default router;
