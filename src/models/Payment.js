const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true, required: true },
    transactionReference: { type: String, index: true },
    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    eventValue: String,

    name: String,
    email: String,
    phone: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: String, default: "pending" },
    metaData: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
