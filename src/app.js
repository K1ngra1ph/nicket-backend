const cors = require("cors");
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const webhookRoutes = require("./routes/webhook");
const numberRoutes = require("./routes/numbers");

const app = express();

app.use(cors({
  origin: "https://nicket-lilac.vercel.app",
  credentials: true,
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));

app.options("*", cors());

app.use("/api/webhook", webhookRoutes);
app.use(express.json());
app.use("/api/numbers", numberRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/merchant", merchantRoutes);

app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

module.exports = app;
