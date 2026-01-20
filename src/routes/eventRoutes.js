import express from "express";
import Event from "../models/Event.js";
import Payment from "../models/Payment.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import sendWinnerEmail from "../services/sendWinnerEmail.js";
import AuditLog from "../models/AuditLog.js";

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

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
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

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/draw", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const winningNumber = Number(req.body.winningNumber);

    if (isNaN(winningNumber)) {
      return res.status(400).json({ message: "Valid winning number is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await Event.findByIdAndUpdate(eventId, {
      winningNumber,
      drawStatus: "drawn",
      active: false
    });

    await Payment.updateMany(
      {
        eventValue: eventId,
        selectedNumbers: winningNumber,
        status: { $in: ["successful", "PAID"] }
      },
      { $set: { "metadata.winner": true } }
    );

    await Payment.updateMany(
      {
        eventValue: eventId,
        selectedNumbers: { $ne: winningNumber },
        status: { $in: ["successful", "PAID"] }
      },
      { $set: { "metadata.winner": false } }
    );

    await AuditLog.create({
      action: "EXECUTE_DRAW",
      details: `Event ${event.name} drawn with number ${winningNumber}`,
      performedBy: req.user.email
    });

    const winners = await Payment.find({
      eventValue: eventId,
      status: { $in: ["successful", "PAID"] },
      "metadata.winner": true
    });

    winners.forEach(winner => {
      sendWinnerEmail(
        winner.email,
        winner.name,
        winner.selectedNumbers,
        event.name
      ).catch(err => console.error(`Failed to notify winner ${winner.email}:`, err.message));
    });

    res.json({ success: true, message: "Draw completed and winners marked." });
  } catch (err) {
    console.error("Draw error:", err);
    res.status(500).json({ message: "Internal server error during draw." });
  }
});

export default router;