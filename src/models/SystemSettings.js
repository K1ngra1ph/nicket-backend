import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'Nicket' },
  supportEmail: { type: String, default: '' },
  currency: { type: String, default: 'NGN' },
  timezone: { type: String, default: 'Africa/Lagos' },
  maintenanceMode: { type: Boolean, default: false },
  socials: {
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model("SystemSettings", systemSettingsSchema);