# NSC Performance App — Vercel Deployment Guide

## File Structure

```
nsc-app/
├── api/
│   ├── create-payment.js     ← Stripe payment intent creator
│   └── send-confirmation.js  ← Booking confirmation emails
├── public/
│   ├── index.html            ← Full app (parent portal + staff portal)
│   └── logo.png              ← Your NSC logo (add this!)
├── package.json
├── vercel.json
└── README.md
```

---

## Step 1 — Add Your Logo

Place your NSC logo file as `public/logo.png` in the project.
(The app will gracefully show "NSC" text if the image is missing.)

---

## Step 2 — Set Your Stripe Publishable Key

In `public/index.html`, find this line near the top of the `<script>` section:

```js
var STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY';
```

Replace it with your actual Stripe **publishable** key from:
**stripe.com → Developers → API Keys → Publishable key**

---

## Step 3 — Deploy to Vercel

### Option A — GitHub (recommended)
1. Create a new GitHub repo
2. Upload all files maintaining the folder structure
3. Go to **vercel.com** → Add New Project → Import your GitHub repo
4. Vercel auto-detects it — click **Deploy**

### Option B — Vercel CLI
```bash
npm i -g vercel
cd nsc-app
vercel --prod
```

---

## Step 4 — Set Environment Variables in Vercel

Go to: **vercel.com → Your Project → Settings → Environment Variables**

Add ALL of these:

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe Dashboard → API Keys |
| `EMAIL_HOST` | `smtp.123-reg.co.uk` | Your SMTP host |
| `EMAIL_PORT` | `465` | |
| `EMAIL_USER` | `info@nscperformance.co.uk` | Your email address |
| `EMAIL_PASS` | `(your email password)` | |
| `STAFF_EMAIL` | `info@nscperformance.co.uk` | Where staff notifications go |

After adding all variables → **Redeploy** (Vercel Dashboard → Deployments → ⋯ → Redeploy)

---

## Step 5 — Test Card Payments

Use these test cards (only works with `sk_test_` / `pk_test_` keys):

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 9995` | ❌ Declined |
| `4000 0025 0000 3155` | 🔐 3D Secure required |

Any future expiry date, any 3-digit CVC, any postcode.

---

## Staff Login

Default staff login credentials (change in the code):
- **Username:** `staff@nscperformance.co.uk`
- **Password:** `nsc2024`

To add more staff: add entries to the `parents` array in `defaultDB()` with `isStaff: true`.

---

## Parent Registration

Parents register themselves via the "Register here" link on the login screen.
All data is stored in the browser's localStorage (no database required).

---

## Stripe Fees (UK Cards)
- 1.4% + 20p per transaction
- £5 session → ~27p fee → you receive £4.73
- £25 holiday camp → ~55p fee → you receive £24.45
- Payouts go directly to your bank account via Stripe
