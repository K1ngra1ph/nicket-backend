import express from "express";

import initiatePayment from "../controllers/payment/initiatePayment.js";
import verifyPayment from "../controllers/payment/verifyPayment.js";
import redirectAfterPayment from "../controllers/payment/redirectAfterPayment.js";
import getPaymentReference from "../controllers/payment/getPaymentReference.js";
import monnifyWebhook from "../controllers/payment/monnifyWebhook.js";

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

export default router;
