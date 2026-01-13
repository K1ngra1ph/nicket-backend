import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema({
  isConfig: { type: Boolean, default: true }, 
  
  platformName: { type: String, default: "Nicket" },
  currency: { type: String, default: "NGN" },
  supportEmail: { type: String, default: "support@nicket.com" },
  
  socials: {
    twitter: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    phone: { type: String, default: "" }
  }
}, { timestamps: true });

export default mongoose.model("SystemSettings", systemSettingsSchema);