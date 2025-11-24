const cors = require("cors");
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoute");
const webhookRoutes = require("./routes/webhook"); // optional separate webhook route
const merchantRoutes = require("./routes/merchantRoutes");

const app = express();

// ===== CORS =====
app.use(cors({
  origin: "https://nicket-lilac.vercel.app",
  credentials: true,
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));

// ===== Raw body for Monnify webhook =====
// Must come BEFORE express.json() for webhook routes
app.use("/api/payments/monnify-webhook", express.raw({ type: "*/*" }));
app.use("/api/webhook/monnify", express.raw({ type: "*/*" })); // optional separate webhook

// ===== JSON body parser for other routes =====
app.use(express.json());

// ===== Health check =====
app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

// ===== Routes =====
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/merchant", merchantRoutes);

// Optional separate webhook route
app.use("/api/webhook", webhookRoutes);

module.exports = app;
