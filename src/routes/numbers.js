const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");

router.get("/availability", async (req, res) => {
  try {
    const payments = await Payment.find({}, { selectedNumbers: 1 });

    const usageCount = {};

    payments.forEach(p => {
      p.selectedNumbers.forEach(num => {
        usageCount[num] = (usageCount[num] || 0) + 1;
      });
    });

    return res.json(usageCount);
  } catch (err) {
    console.error("Number availability error:", err);
    return res.status(500).json({ error: "Server error loading availability." });
  }
});

module.exports = router;
