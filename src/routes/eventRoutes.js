import express from "express";
import Event from "../models/Event.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const query = {};
  if (req.query.active === "true") query.active = true;

  const events = await Event.find(query).sort({ createdAt: -1 });
  res.json(events);
});

export default router;