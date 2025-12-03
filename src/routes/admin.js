import express from "express";
import Payment from "../models/Payment.js";

const router = express.Router();

router.get("/monthly-total", async (req, res) => {
  const month = parseInt(req.query.month);
  const year = new Date().getFullYear();

  try {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const payments = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "successful"
        }
      },
      {
        $group: {
          _id: "$eventValue",
          amountPaid: { $sum: "$amountPaid" }
        }
      },
      {
        $project: {
          eventValue: "$_id",
          amountPaid: 1,
          _id: 0
        }
      }
    ]);

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
