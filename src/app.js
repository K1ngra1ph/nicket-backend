const cors = require("cors");
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const webhookRoutes = require("./routes/webhook"); // Add this

const app = express();

// CORS config
app.use(cors({
  origin: "https://nicket-lilac.vercel.app",
  credentials: true,
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));

app.options("*", cors());

// Middleware order: raw for Monnify webhook
app.use("/api/webhook", webhookRoutes);
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/merchant", merchantRoutes);

app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

module.exports = app;