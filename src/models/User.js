import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["user", "admin", "merchant"],
      default: "user"
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);