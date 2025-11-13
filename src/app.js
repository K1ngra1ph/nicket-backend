const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(express.json());
app.use(cors({ origin: [
  "https://nicket-lilac.vercel.app", 
  "https://nicket-lilac.vercel.app/game"
], credentials: true }));

app.get("/", (req, res) => res.send("🔥 Nicket Backend running with MongoDB!"));

app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;
