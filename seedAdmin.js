import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/User.js"; 

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB...");

    const existingAdmin = await User.findOne({ email: "pauloanmove@gmail.com" });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists!");
      process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const newAdmin = new User({
      name: "Super Admin",
      email: "pauloanmove@gmail.com",
      password: hashedPassword,
      role: "admin",
      permissions: ["dashboard", "events", "payments", "users", "settings"]
    });

    await newAdmin.save();
    console.log("🎉 Admin created successfully!");
    console.log("📧 Email: pauloanmove@gmail.com");
    console.log("🔑 Pass: password123");
    
    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();