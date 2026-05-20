// =============================================================
// FILE: api/create-payment.js
// Vercel Serverless Function — creates a Stripe PaymentIntent
// =============================================================
// REQUIRED ENV VARS (set in Vercel dashboard → Settings → Env):
//   STRIPE_SECRET_KEY = sk_live_...  (your Stripe secret key)
// =============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, description, customerEmail, metadata } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Invalid amount — minimum is 50p' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in pence, e.g. 500 = £5.00
      currency: 'gbp',
      description: description || 'NSC Performance Session Booking',
      receipt_email: customerEmail || undefined,
      payment_method_types: ['card'], // card only — no Apple Pay required
      metadata: {
        ...(metadata || {}),
        source: 'nsc-performance-portal',
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
