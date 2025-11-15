const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true, required: true },
    amount: Number,
    eventValue: String,

    name: String,
    email: String,
    phone: String,

    status: { type: String, default: "pending" },
    transactionReference: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
