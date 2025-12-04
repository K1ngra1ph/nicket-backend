// src/routes/adminAnalytics.js
import express from "express";
import Payment from "../models/Payment.js";
import Event from "../models/Event.js";

const router = express.Router();

// GET /api/admin/analytics/events
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().select("name _id").sort({ createdAt: -1 });
    return res.json(events);
  } catch (err) {
    console.error("GET /events error:", err);
    return res.status(500).json({ error: "Failed to load events" });
  }
});

// GET /api/admin/analytics/revenue?eventId=...
router.get("/revenue", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    const payments = await Payment.find({ eventValue: eventId, status: "successful" });

    const totalRevenue = payments.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const totalTransactions = payments.length;

    return res.json({ totalRevenue, totalTransactions });
  } catch (err) {
    console.error("GET /revenue error:", err);
    return res.status(500).json({ error: "Failed to load revenue" });
  }
});

// GET /api/admin/analytics/availability?eventId=...
router.get("/availability", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    // Pull successful payments that have selectedNumbers (supports both metaData.selectedNumbers or selectedNumbers)
    const payments = await Payment.find(
      { eventValue: eventId, status: "successful" },
      { "metaData.selectedNumbers": 1, selectedNumbers: 1 }
    );

    const usedMap = {};
    for (const p of payments) {
      const arr = Array.isArray(p.selectedNumbers)
        ? p.selectedNumbers
        : p.metaData?.selectedNumbers ?? [];
      for (const n of arr) {
        const num = Number(n);
        if (!Number.isInteger(num)) continue;
        usedMap[num] = (usedMap[num] || 0) + 1;
      }
    }

    const MAX_PER_NUMBER = 10; // change if needed
    const MAX_NUMBER = 100; // numbers 1..100 (change if your range differs)

    const availability = [];
    for (let i = 1; i <= MAX_NUMBER; i++) {
      const used = usedMap[i] || 0;
      availability.push({
        number: i,
        used,
        available: Math.max(0, MAX_PER_NUMBER - used)
      });
    }

    return res.json(availability);
  } catch (err) {
    console.error("GET /availability error:", err);
    return res.status(500).json({ error: "Failed to load availability" });
  }
});

// GET /api/admin/analytics/monthly-total?month=10
router.get("/monthly-total", async (req, res) => {
  try {
    const month = parseInt(req.query.month || (new Date().getMonth() + 1), 10);
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ error: "month must be 1..12" });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const agg = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "successful"
        }
      },
      {
        $group: {
          _id: "$eventValue",
          amountPaid: { $sum: "$amountPaid" }
        }
      },
      {
        $project: {
          eventValue: "$_id",
          amountPaid: 1,
          _id: 0
        }
      },
      { $sort: { amountPaid: -1 } }
    ]);

    return res.json(agg);
  } catch (err) {
    console.error("GET /monthly-total error:", err);
    return res.status(500).json({ error: "Failed to compute monthly totals" });
  }
});

export default router;
