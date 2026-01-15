import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import paymentRoutes from "./routes/paymentRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import numberRoutes from "./routes/numbers.js";
import eventRoutes from "./routes/eventRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { verifyToken, verifyAdmin } from "./middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(
  cors({
    origin: ["https://nicket-lilac.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// 1. Webhook Route
app.post(
  "/api/payments/monnify-webhook",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    req.isRawBody = true;
    next();
  }
);

// 3. API Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/numbers", numberRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/events", eventRoutes); 
app.use("/api/users", verifyAdmin, userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

// 2. Serve Static Files (Admin Panel)
const buildPath = path.resolve(__dirname, "admin/build");
console.log("Serving admin static files from:", buildPath);
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  if (req.url.startsWith('/api')) {
     return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(buildPath, "index.html"));
});

export default app;
