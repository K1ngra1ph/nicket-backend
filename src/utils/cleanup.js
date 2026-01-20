import cron from "node-cron";
import Payment from "../models/Payment.js";

cron.schedule("0 * * * *", async () => {
  console.log("🧹 Running Database Cleanup: Removing abandoned pending payments...");
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await Payment.deleteMany({
      status: "pending",
      createdAt: { $lt: twentyFourHoursAgo }
    });
    
    console.log(`✅ Cleanup complete. Removed ${result.deletedCount} abandoned sessions.`);
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
});