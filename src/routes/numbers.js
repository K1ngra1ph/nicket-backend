import express from "express";
import Payment from "../models/Payment.js";

const router = express.Router();

router.get("/availability", async (req, res) => {
  try {
    const { eventId } = req.query;
    const query = {
      status: { $in: ["successful", "PAID"] }
    };
    if (eventId) {
      query.eventValue = eventId;
    }
    
    const payments = await Payment.find(query, { selectedNumbers: 1 });
    const usageCount = {};
    for (let i = 1; i <= 100; i++) {
      usageCount[i] = 0;
    }

    payments.forEach(payment => {
      if (Array.isArray(payment.selectedNumbers)) {
        payment.selectedNumbers.forEach(num => {
          const n = Number(num);
          if (!isNaN(n) && n >= 1 && n <= 100) {
            usageCount[n]++;
          }
        });
      }
    });

    return res.json(usageCount);
  } catch (err) {
    console.error("Number availability error:", err);
    return res.status(500).json({
      error: "Server error loading availability."
    });
  }
});

export default router;
