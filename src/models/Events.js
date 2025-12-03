import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },  
  location: { type: String, required: true },
  date: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Event", eventSchema);