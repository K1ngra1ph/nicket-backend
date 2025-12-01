import express from "express";
import Payment from "../models/Payment.js";

const router = express.Router();

router.get("/availability", async (req, res) => {
  try {
    const payments = await Payment.find({}, { selectedNumbers: 1 });

    const usageCount = {};

    payments.forEach(p => {
      if (Array.isArray(p.selectedNumbers)) {
        p.selectedNumbers.forEach(num => {
          const n = Number(num);
          if (!isNaN(n) && n > 0) {
            usageCount[n] = (usageCount[n] || 0) + 1;
          }
        });
      }
    });

    for (let i = 1; i <= 100; i++) {
      if (!usageCount[i]) usageCount[i] = 0;
    }

    return res.json(usageCount);
  } catch (err) {
    console.error("Number availability error:", err);
    return res.status(500).json({ error: "Server error loading availability." });
  }
});

export default router;
