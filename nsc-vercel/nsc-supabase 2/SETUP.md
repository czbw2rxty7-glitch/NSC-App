# NSC Performance Portal v2 — Setup Guide
# Now with persistent Supabase database

## What's New
- Parent accounts saved permanently
- All bookings stored in database
- Session management persisted
- Payment history saved forever
- Player profiles stored securely

---

## Step 1 — Create Supabase Account

1. Go to **supabase.com**
2. Click **Start your project** — sign up free with GitHub or email
3. Click **New project**
4. Name it: `nsc-performance`
5. Set a strong database password (save this somewhere safe)
6. Region: **West Europe** (closest to Harlow)
7. Click **Create new project** — takes about 2 minutes

---

## Step 2 — Set Up the Database

1. In your Supabase project, click **SQL Editor** in the left menu
2. Click **New query**
3. Open the file `database-setup.sql` from this folder
4. Copy ALL the contents and paste into the SQL editor
5. Click **Run**
6. You should see "Success. No rows returned"
7. Your database tables are now created!

---

## Step 3 — Get Your Supabase Keys

1. In Supabase, click **Settings** (gear icon) in the left menu
2. Click **API**
3. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **service_role key** — the secret key (NOT the anon key)

---

## Step 4 — Add Keys to Netlify

Go to Netlify → your site → Site configuration → Environment variables

Add these (you should already have the others from before):

| Key | Value |
|-----|-------|
| SUPABASE_URL | https://your-project.supabase.co |
| SUPABASE_KEY | your service_role key |
| STRIPE_SECRET_KEY | sk_live_... (already set) |
| EMAIL_HOST | smtp.123-reg.co.uk (already set) |
| EMAIL_PORT | 465 (already set) |
| EMAIL_USER | info@nscperformance.co.uk (already set) |
| EMAIL_PASS | your email password (already set) |
| STAFF_EMAIL | nathanielsteed.coaching@outlook.com (already set) |

---

## Step 5 — Deploy

1. Drag the `nsc-supabase` folder to Netlify drop zone
   OR upload via GitHub as before
2. Trigger deploy
3. Wait 60 seconds

---

## Step 6 — Test

1. Go to your live site
2. Click **Parent** → **New to NSC Performance?** → **Create Account**
3. Fill in details and create an account
4. Log out and log back in — your account should still be there!
5. Add a child and make a booking

---

## Staff Login
Username: nathaniel
Password: nsc2026

---

## Adding Your Real Sessions

After deploying:
1. Log in as staff
2. Go to Sessions → + New Session
3. Add all your real upcoming sessions
4. Parents will immediately see them when they go to Book

---

## Important — SUPABASE_KEY Security

The service_role key gives full access to your database.
- NEVER put it in your HTML file
- ONLY add it as a Netlify environment variable
- It only runs on Netlify's secure servers via the db.js function
