// src/models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true, required: true },
    transactionReference: { type: String, index: true },

    // Payment amounts
    amount: { type: Number, required: true },       // expected amount
    amountPaid: { type: Number, default: 0 },       // actual amount paid

    // Event/game info
    eventValue: { type: String, required: true },

    // Player info
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Status
    status: { type: String, enum: ["pending", "successful", "failed"], default: "pending", index: true },

    // Metadata for game logic
    metaData: {
      event: { type: String, required: true },
      playerName: { type: String, required: true },
      playerEmail: { type: String, required: true },
      selectedNumbers: {
        type: [Number],
        required: true,
        validate: {
          validator: arr => arr.length > 0 && arr.every(n => Number.isInteger(n) && n > 0),
          message: "selectedNumbers must be a non-empty array of positive integers"
        }
      },
      winner: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

// Index for fast queries on event and selected numbers
paymentSchema.index({ "metaData.event": 1, "metaData.selectedNumbers": 1 });

// Static method to get winners
paymentSchema.statics.getWinners = function(eventValue) {
  return this.find({ eventValue, "metaData.winner": true, status: "successful" });
};

module.exports = mongoose.model("Payment", paymentSchema);
