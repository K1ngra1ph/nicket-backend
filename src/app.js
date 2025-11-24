const cors = require("cors");
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhook");
const merchantRoutes = require("./routes/merchantRoutes");

const app = express();

app.use(cors({
  origin: "https://nicket-lilac.vercel.app",
  credentials: true,
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));
s
app.use("/api/payments/monnify-webhook", express.raw({ type: "*/*" }));
app.use("/api/webhook/monnify", express.raw({ type: "*/*" }));

app.use(express.json());

app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/webhook", webhookRoutes);

module.exports = app;
