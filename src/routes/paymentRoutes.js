import express from "express";
import Payment from "../models/Payment.js";
import initiatePayment from "../controllers/payment/initiatePayment.js";
import verifyPayment from "../controllers/payment/verifyPayment.js";
import redirectAfterPayment from "../controllers/payment/redirectAfterPayment.js";
import getPaymentReference from "../controllers/payment/getPaymentReference.js";
import monnifyWebhook from "../controllers/payment/monnifyWebhook.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate-payment", initiatePayment);
router.get("/verify/:paymentReference", verifyPayment);
router.get("/redirect", redirectAfterPayment);
router.get("/get-payment-reference", getPaymentReference);

router.post(
  "/monnify-webhook",
  express.raw({ type: "*/*" }),
  monnifyWebhook
);

// 1. Get all payments list
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Refund a payment
router.post("/:id/refund", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    
    payment.status = "refunded"; 
    await payment.save();

    res.json({ message: "Refund processed successfully", payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;