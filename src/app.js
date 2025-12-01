import express from "express";
import cors from "cors";

import paymentRoutes from "./routes/paymentRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import numberRoutes from "./routes/numbers.js";

import { createAdminPanel } from "./admin.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: "GET,POST,OPTIONS",
    allowedHeaders: "Content-Type,Authorization"
  })
);

app.options("*", cors());

app.use(express.json());

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

app.get("/", (req, res) => {
  res.send("🔥 Nicket Backend running with MongoDB!");
});

export default app;
