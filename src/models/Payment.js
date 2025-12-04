import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, unique: true, required: true },
    transactionReference: { type: String, index: true },

    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },

    eventValue: { type: String, required: true },

    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    selectedNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: arr =>
          arr.length > 0 &&
          arr.every(n => Number.isInteger(n) && n > 0),
        message: "selectedNumbers must be a non-empty array of positive integers"
      }
    },

    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

paymentSchema.statics.getWinners = function (eventValue) {
  return this.find({
    eventValue,
    "status": "successful"
  });
};

export default mongoose.model("Payment", paymentSchema);
