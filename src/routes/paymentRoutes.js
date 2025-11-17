const express = require("express");
const {
  initiatePayment,
  verifyPayment,
  monnifyWebhook
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/initiate-payment", initiatePayment);
router.post("/verify-payment", verifyPayment);
router.post("/webhook", express.raw({ type: "*/*" }), monnifyWebhook);

module.exports = router;
