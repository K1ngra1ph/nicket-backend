const express = require("express");
const router = express.Router();

console.log("🔧 Debug: Loading payment routes...");

const initiatePayment = require("../controllers/payment/initiatePayment");
const verifyPayment = require("../controllers/payment/verifyPayment");
const redirectAfterPayment = require("../controllers/payment/redirectAfterPayment");
const getPaymentReference = require("../controllers/payment/getPaymentReference");
const monnifyWebhook = require("../controllers/payment/monnifyWebhook");

console.log("🔧 Debug: Controllers loaded successfully");

router.post("/initiate-payment", (req, res, next) => {
  console.log("➡️ Debug: POST /initiate-payment hit");
  next();
}, initiatePayment);

router.get("/verify/:paymentReference", (req, res, next) => {
  console.log("➡️ Debug: GET /verify/:paymentReference hit");
  next();
}, verifyPayment);

router.get("/redirect", (req, res, next) => {
  console.log("➡️ Debug: GET /redirect hit");
  next();
}, redirectAfterPayment);

router.get("/get-payment-reference", (req, res, next) => {
  console.log("➡️ Debug: GET /get-payment-reference hit");
  next();
}, getPaymentReference);

router.post(
  "/monnify-webhook",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    console.log("➡️ Debug: POST /monnify-webhook hit");
    console.log("🔍 Debug: Raw body length:", req.body?.length);
    next();
  },
  monnifyWebhook
);

console.log("🔧 Debug: Payment routes initialized");

module.exports = router;
