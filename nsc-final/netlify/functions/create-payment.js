// netlify/functions/create-payment.js
// Creates a Stripe PaymentIntent securely on the server.
//
// Required environment variables in Netlify dashboard:
//   STRIPE_SECRET_KEY = sk_live_... (or sk_test_... for testing)

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }
  try {
    const { amount, currency = "gbp", description, customerEmail, metadata = {} } = JSON.parse(event.body);
    if (!amount || amount < 50) {
      return reply(400, { error: "Invalid amount — minimum is 50p" });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      description: description || "NSC Performance Session Booking",
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: { ...metadata, source: "nsc-portal" }
    });
    return reply(200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error("Stripe error:", err.message);
    return reply(500, { error: err.message });
  }
};

function reply(code, body) {
  return { statusCode: code, headers: cors(), body: JSON.stringify(body) };
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}
