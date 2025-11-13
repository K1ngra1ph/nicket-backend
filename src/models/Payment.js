const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true },
    amountPaid: Number,
    paymentStatus: String,
    customerEmail: String,
    customerName: String,
    transactionReference: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);