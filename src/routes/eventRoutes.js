import express from "express";
import Event from "../models/Event.js";
import Payment from "../models/Payment.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.active === "true") query.active = true;

    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/draw", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { winningNumber } = req.body;
    const eventId = req.params.id;

    if (!winningNumber) {
      return res.status(400).json({ message: "Winning number is required" });
    }

    await Event.findByIdAndUpdate(eventId, {
      winningNumber,
      drawStatus: "drawn",
      active: false
    });

    await Payment.updateMany(
      {
        eventValue: eventId,
        selectedNumbers: winningNumber,
        status: "successful"
      },
      { $set: { "metadata.winner": true } }
    );

    await Payment.updateMany(
      {
        eventValue: eventId,
        selectedNumbers: { $ne: winningNumber },
        status: "successful"
      },
      { $set: { "metadata.winner": false } }
    );

    res.json({ message: "Draw completed successfully" });
  } catch (err) {
    console.error("Draw error:", err);
    res.status(500).json({ message: "Failed to complete draw" });
  }
});

export default router;