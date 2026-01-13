import express from "express";
import Event from "../models/Event.js";
import { verifyToken } from "../middleware/authMiddleware.js"; 

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

// PROTECTED: Only Admins can create/edit/delete
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

export default router;