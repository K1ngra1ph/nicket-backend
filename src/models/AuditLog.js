import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String },
  performedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("AuditLog", auditLogSchema);