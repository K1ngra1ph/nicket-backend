import express from "express";
import Payment from "../models/Payment.js";

const router = express.Router();

router.get("/availability", async (req, res) => {
  try {
    const { eventId } = req.query;
    
    // 1. Only count payments for this specific event that haven't failed
    const query = {
      status: { $in: ['successful', 'pending', 'PAID'] }
    };
    
    if (eventId) {
      query.eventValue = eventId;
    }

    const payments = await Payment.find(query, { selectedNumbers: 1 });

    const usageCount = {};
    for (let i = 1; i <= 100; i++) {
      usageCount[i] = 0;
    }

    // 2. Count occurrences
    payments.forEach(p => {
      if (Array.isArray(p.selectedNumbers)) {
        p.selectedNumbers.forEach(num => {
          const n = Number(num);
          if (!isNaN(n) && n > 0 && n <= 100) {
            usageCount[n] = (usageCount[n] || 0) + 1;
          }
        });
      }
    });

    return res.json(usageCount);
  } catch (err) {
    console.error("Number availability error:", err);
    return res.status(500).json({ error: "Server error loading availability." });
  }
});

export default router;