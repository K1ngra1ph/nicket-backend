const mongoose = require("mongoose");

const numberCountSchema = new mongoose.Schema(
  {
    eventValue: { type: String, required: true, index: true },
    number: { type: Number, required: true },
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 10 }, // maximum allowed per number
  },
  { timestamps: true }
);

// Ensure each number per event is unique
numberCountSchema.index({ eventValue: 1, number: 1 }, { unique: true });

/**
 * Increment the count safely
 * Returns the updated count
 */
numberCountSchema.statics.incrementCount = async function(eventValue, number) {
  const doc = await this.findOneAndUpdate(
    { eventValue, number, count: { $lt: 10 } },
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );
  return doc;
};

/**
 * Check if a number is available for selection
 */
numberCountSchema.statics.isAvailable = async function(eventValue, number) {
  const doc = await this.findOne({ eventValue, number });
  if (!doc) return true;
  return doc.count < (doc.maxCount || 10);
};

module.exports = mongoose.model("NumberCount", numberCountSchema);