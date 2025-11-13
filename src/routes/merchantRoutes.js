const express = require("express");
const router = express.Router();

const CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE || "8779904402";

router.get("/contract-code", (req, res) => {
  res.json({ contractCode: CONTRACT_CODE });
});

module.exports = router;
