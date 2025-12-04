import express from "express";
import Payment from "../models/Payment.js";
import SelectedNumber from "../models/SelectedNumber.js";
import Event from "../models/Event.js";

const router = express.Router();

router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().select("name _id maxNumbers").sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("GET /events error:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

router.get("/revenue-analytics", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const payments = await Payment.find({ eventValue: eventId, status: "PAID" });

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalPayments = payments.length;

    const soldNumbers = await SelectedNumber.countDocuments({ eventValue: eventId });
    const availableNumbers = (event.maxNumbers || 1000) - soldNumbers;

    res.json({
      eventName: event.name,
      totalRevenue,
      totalPayments,
      soldNumbers,
      availableNumbers,
      maxNumbers: event.maxNumbers || 1000,
    });

  } catch (err) {
    console.error("GET /revenue-analytics error:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
