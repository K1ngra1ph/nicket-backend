const express = require("express");
const router = express.Router();

const initiatePayment = require("../controllers/payment/initiatePayment");
const verifyPayment = require("../controllers/payment/verifyPayment");
const redirectAfterPayment = require("../controllers/payment/redirectAfterPayment");
const monnifyWebhook = require("../controllers/payment/monnifyWebhook");

router.post("/initiate-payment", initiatePayment);
router.get("/verify/:paymentReference", verifyPayment);
router.get("/redirect", redirectAfterPayment);

router.post("/monnify-webhook",
  express.raw({ type: "*/*" }),
  monnifyWebhook
);

module.exports = router;
