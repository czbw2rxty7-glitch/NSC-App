# NSC Performance Portal — Setup Guide

## Folder Structure (must match exactly)
```
nsc-final/
├── public/
│   └── index.html          ← The app
├── netlify/
│   └── functions/
│       ├── create-payment.js
│       ├── send-confirmation.js
│       └── webhook.js
├── netlify.toml
└── package.json
```

## Deploy to Netlify

1. Go to netlify.com → your site → Deploys tab
2. Scroll to the bottom — drag the entire `nsc-final` FOLDER into the box
3. Wait 60 seconds — done!

## Environment Variables (add in Netlify Dashboard)

Site Configuration → Environment Variables → Add a variable

| Key | Value |
|-----|-------|
| STRIPE_SECRET_KEY | sk_test_... or sk_live_... |
| EMAIL_HOST | smtp.123-reg.co.uk |
| EMAIL_PORT | 465 |
| EMAIL_USER | info@nscperformance.co.uk |
| EMAIL_PASS | your email password |
| STAFF_EMAIL | nathanielsteed.coaching@outlook.com |

After adding all variables: Deploys → Trigger deploy → Deploy site

## Login Details

**Staff:** username `nathaniel` / password `nsc2026`
**Parent demo:** email `demo@nsc.com` / password `demo123`

## Test Payments

Use Stripe test card: **4242 4242 4242 4242**
Expiry: any future date (e.g. 12/29) | CVC: any 3 digits

## Going Live with Real Payments

1. In Stripe, switch from Test to Live mode
2. In index.html find `pk_test_51TUYvO8...` and replace with your `pk_live_...` key
3. Update `STRIPE_SECRET_KEY` in Netlify with your `sk_live_...` key
4. Redeploy
