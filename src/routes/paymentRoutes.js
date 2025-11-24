const express = require("express");
const router = express.Router();
const { initiatePayment, monnifyWebhook } = require("../controllers/paymentController");

// POST /api/payments/initiate-payment
router.post("/initiate-payment", initiatePayment);

// POST /api/payments/monnify-webhook
// Webhook must use raw body parser for signature validation
router.post("/monnify-webhook", express.raw({ type: "*/*" }), monnifyWebhook);

module.exports = router;