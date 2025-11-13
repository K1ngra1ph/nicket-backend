const express = require("express");
const { initiatePayment, verifyPayment } = require("../controllers/paymentController");

const router = express.Router();
router.post("/initiate-payment", initiatePayment);
router.post("/verify-payment", verifyPayment);

module.exports = router;