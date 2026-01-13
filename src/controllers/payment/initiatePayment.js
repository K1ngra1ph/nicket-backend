import axios from "axios";
import Payment from "../../models/Payment.js";
import Event from "../../models/Event.js";
import normalizeNumbers from "./normalizeSelectedNumbers.js";
import { getMonnifyToken } from "../../services/monnifyService.js";

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

export default async function initiatePayment(req, res) {
  try {
    console.log("🔵 [DEBUG] Incoming initiatePayment body:", req.body);

    const { name, email, phone, selectedNumbers, eventValue } = req.body;

    const numbers = normalizeNumbers(selectedNumbers);
    if (numbers.length === 0) {
      return res.status(400).json({ message: "No numbers selected" });
    }

    const eventDoc = await Event.findById(eventValue);
    const ticketPrice = eventDoc?.price || 1000; 
    const calculatedAmount = numbers.length * ticketPrice;

    console.log(`💰 [DEBUG] Price Check: ${numbers.length} tickets x ₦${ticketPrice} = ₦${calculatedAmount}`);

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount: calculatedAmount,
      paymentReference,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerId: email,
      paymentDescription: `Nicket Payment - ${eventDoc?.name || eventValue}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: `${process.env.BACKEND_URL}/api/payments/redirect`,
      metaData: {
        event: eventValue,
        playerName: name,
        playerEmail: email,
        selectedNumbers: numbers.join(","),
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.requestSuccessful) {
      return res.status(400).json({
        message: "Monnify init failed",
        error: response.data
      });
    }

    const txnRef = response.data.responseBody.transactionReference;

    await Payment.create({
      paymentReference,
      transactionReference: txnRef,
      amount: calculatedAmount,
      amountPaid: 0,
      eventValue,
      name,
      email,
      phone,
      status: "pending",
      selectedNumbers: numbers,
      metaData: {
        eventName: eventDoc?.name || "Unknown Event",
        winner: false
      }
    });

    return res.json({
      success: true,
      checkoutUrl: response.data.responseBody.checkoutUrl,
      paymentReference,
      transactionReference: txnRef
    });

  } catch (err) {
    console.error("❌ [DEBUG] initiatePayment ERROR:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
}