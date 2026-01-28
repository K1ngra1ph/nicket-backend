import cron from "node-cron";
import Payment from "../models/Payment.js";

cron.schedule("0 * * * *", async () => {
  console.log("🧹 Running System Cleanup...");

  try {
    const cutOff = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const result = await Payment.updateMany(
      {
        status: "pending",
        createdAt: { $lt: cutOff }
      },
      {
        $set: {
          status: "failed",
          failureReason: "Checkout abandoned for over 8 hours"
        }
      }
    );

    console.log(
      `✅ Cleanup complete: ${result.modifiedCount} stale payments marked as FAILED.`
    );
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
});
