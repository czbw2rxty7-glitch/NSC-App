// ============================================================
// FILE: api/create-payment.js
// Vercel serverless function — creates Stripe PaymentIntent
//
// Required environment variable (set in Vercel dashboard):
//   STRIPE_SECRET_KEY = sk_live_...
// ============================================================

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const {
      amount,
      currency = "gbp",
      description,
      customerEmail,
      metadata = {}
    } = req.body;

    if (!amount || amount < 50) {
      res.status(400).json({ error: "Invalid amount — minimum is 50p" });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      description: description || "NSC Performance Session Booking",
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: { ...metadata, source: "nsc-portal" }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
