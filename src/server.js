const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");
const app = express();
const paymentRoutes = require("./routes/paymentRoutes");

app.use(express.json());
app.use("/api/payments", paymentRoutes);

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
