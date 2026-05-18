// netlify/functions/webhook.js
// Handles Stripe webhook events.
//
// Required environment variables:
//   STRIPE_SECRET_KEY     = sk_live_...
//   STRIPE_WEBHOOK_SECRET = whsec_... (from Stripe Dashboard → Webhooks)
//
// Setup in Stripe Dashboard:
//   Developers → Webhooks → Add endpoint
//   URL: https://YOUR-SITE.netlify.app/api/webhook
//   Events: payment_intent.succeeded, payment_intent.payment_failed

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return { statusCode: 400, body: "Webhook Error: " + err.message };
  }
  switch (stripeEvent.type) {
    case "payment_intent.succeeded": {
      const intent = stripeEvent.data.object;
      console.log("Payment succeeded:", intent.id, "£" + (intent.amount / 100).toFixed(2));
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = stripeEvent.data.object;
      console.error("Payment failed:", intent.id, intent.last_payment_error && intent.last_payment_error.message);
      break;
    }
    default:
      console.log("Event received:", stripeEvent.type);
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
