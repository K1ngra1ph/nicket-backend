const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true, required: true },
    transactionReference: { type: String, index: true },
    
    // Payment amounts
    amount: { type: Number, required: true },        // Expected amount
    amountPaid: { type: Number, default: 0 },        // Amount actually paid

    // Event / game info
    eventValue: { type: String, required: true },

    // Player info
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Status tracking
    status: { 
      type: String, 
      enum: ["pending", "successful", "failed"], 
      default: "pending",
      index: true
    },

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
      winner: { type: Boolean, default: false } // will be set true if player wins
    }
  },
  { timestamps: true }
);

// Compound index to quickly check if a number has already been claimed in an event
paymentSchema.index(
  { "metaData.event": 1, "metaData.selectedNumbers": 1 }, 
  { unique: false }
);

// Optional: Static method to find winners for an event
paymentSchema.statics.getWinners = function(eventValue) {
  return this.find({
    eventValue,
    "metaData.winner": true,
    status: "successful"
  });
};

module.exports = mongoose.model("Payment", paymentSchema);
