const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  redirectAfterPayment,
  monnifyWebhook
} = require("../controllers/paymentController");

router.post("/initiate-payment", initiatePayment);
router.get("/verify-payment/:paymentReference", verifyPayment);
router.get("/redirect", redirectAfterPayment);
router.post("/monnify-webhook", express.raw({ type: "*/*" }), monnifyWebhook);

module.exports = router;
