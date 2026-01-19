import axios from "axios";
import Payment from "../../models/Payment.js";
import Event from "../../models/Event.js";
import normalizeNumbers from "./normalizeSelectedNumbers.js";
import { getMonnifyToken } from "../../services/monnifyService.js";

const BASE_URL =
  process.env.MONNIFY_MODE?.toUpperCase() === "LIVE"
    ? "https://api.monnify.com"
    : "https://sandbox.monnify.com";

const SLOT_LIMIT = 10; 

export default async function initiatePayment(req, res) {
  try {
    const { name, email, phone, selectedNumbers, eventValue, eventName } = req.body;
    const numbers = normalizeNumbers(selectedNumbers);

    if (numbers.length === 0) {
      return res.status(400).json({ message: "No numbers selected" });
    }

    const eventDoc = await Event.findById(eventValue);
    
    if (!eventDoc) {
      return res.status(404).json({ message: "The selected prize no longer exists." });
    }

    if (eventDoc.drawStatus === 'drawn' || !eventDoc.active) {
      return res.status(400).json({ message: "This raffle is closed. No more entries allowed." });
    }

    const existingPayments = await Payment.find({ 
      eventValue: eventValue, 
      status: { $in: ["successful", "pending"] },
    }, { selectedNumbers: 1 });

    const usageCount = {};
    existingPayments.forEach(p => {
      p.selectedNumbers.forEach(num => {
        usageCount[num] = (usageCount[num] || 0) + 1;
      });
    });

    for (let num of numbers) {
      if ((usageCount[num] || 0) >= SLOT_LIMIT) {
        return res.status(400).json({ 
          message: `Number ${num} just sold out! Please go back and pick another number.` 
        });
      }
    }

    const ticketPrice = Number(eventDoc.price) || 1000; 
    const calculatedAmount = numbers.length * ticketPrice;

    const token = await getMonnifyToken();
    const paymentReference = `NICKET-${Date.now()}`;

    const payload = {
      amount: calculatedAmount,
      paymentReference,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerId: email,
      paymentDescription: `Nicket Play - ${eventDoc.name}`,
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
      return res.status(400).json({ message: "Monnify connection failed" });
    }

    const txnRef = response.data.responseBody.transactionReference;

    await Payment.create({
      paymentReference,
      transactionReference: txnRef,
      amount: calculatedAmount,
      amountPaid: 0,
      eventValue,
      eventName: eventDoc.name,
      name,
      email,
      phone,
      status: "pending",
      selectedNumbers: numbers,
      metadata: {
        winner: false,
        playerEmail: email
      }
    });

    return res.json({
      success: true,
      checkoutUrl: response.data.responseBody.checkoutUrl,
      paymentReference,
      transactionReference: txnRef
    });

  } catch (err) {
    console.error("❌ initiatePayment Server Error:", err.message);
    return res.status(500).json({ message: "Unable to process payment request." });
  }
}