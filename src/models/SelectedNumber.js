// src/models/NumberCount.js
const mongoose = require("mongoose");

const numberCountSchema = new mongoose.Schema(
  {
    eventValue: { type: String, required: true, index: true },
    number: { type: Number, required: true },
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 10 }
  },
  { timestamps: true }
);

numberCountSchema.index({ eventValue: 1, number: 1 }, { unique: true });

// Increment safely
numberCountSchema.statics.incrementCount = async function(eventValue, number) {
  const doc = await this.findOneAndUpdate(
    { eventValue, number, count: { $lt: 10 } },
    { $inc: { count: 1 }, $setOnInsert: { maxCount: 10 } },
    { new: true, upsert: true }
  );
  return doc;
};

// Check availability
numberCountSchema.statics.isAvailable = async function(eventValue, number) {
  const doc = await this.findOne({ eventValue, number });
  return !doc || doc.count < (doc.maxCount || 10);
};

module.exports = mongoose.model("NumberCount", numberCountSchema);
