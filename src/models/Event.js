import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },  
  location: { type: String, required: true },
  date: { type: String, required: true },
  active: { type: Boolean, default: true },
  currency: { type: String, default: "NGN" },
  price: { type: Number, required: true },
  winningNumber: { type: Number, default: null },
  drawStatus: { type: String, enum: ['open', 'drawn'], default: 'open' },
  image: { type: String }
}, { timestamps: true });

export default mongoose.model("Event", eventSchema);