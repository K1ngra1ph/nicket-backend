import express from "express";
import cors from "cors";

import paymentRoutes from "./routes/paymentRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import numberRoutes from "./routes/numbers.js";
import adminRoutes from "./routes/admin.js";
import eventRoutes from "./routes/eventRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.js";

import { createAdminPanel } from "./admin.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.post(
  "/api/payments/monnify-webhook",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    req.isRawBody = true;
    next();
  }
);

await createAdminPanel(app);

app.use("/api/payments", paymentRoutes);
app.use("/api/numbers", numberRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminAnalyticsRoutes);
app.use("/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("🔥 Nicket Backend running with MongoDB + Admin Panel!");
});

export default app;
