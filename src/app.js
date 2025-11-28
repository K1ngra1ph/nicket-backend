const cors = require("cors");
const express = require("express");
const paymentRoutes = require("./routes/paymentRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const numberRoutes = require("./routes/numbers");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));
app.options("*", cors());

app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/numbers", numberRoutes);
app.use("/api/merchant", merchantRoutes);

app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

module.exports = app;
