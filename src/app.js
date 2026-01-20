import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import monnifyWebhook from "./controllers/payment/monnifyWebhook.js"; 
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

app.post(
  "/api/payments/monnify-webhook",
  express.raw({ type: "application/json" }),
  monnifyWebhook
);

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

const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { message: "Too many attempts. Please wait 60 seconds." },
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use("/api/payments/initiate-payment", paymentLimiter);
app.use("/api/payments/verify", paymentLimiter);
app.use("/api/payments", paymentRoutes);
app.use("/api/numbers", numberRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/events", eventRoutes); 
app.use("/api/users", verifyAdmin, userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

const buildPath = path.resolve(__dirname, "admin/build");
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  if (req.url.startsWith('/api')) {
     return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(buildPath, "index.html"));
});

export default app;