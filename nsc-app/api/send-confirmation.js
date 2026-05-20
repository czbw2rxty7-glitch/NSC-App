// =============================================================
// FILE: api/send-confirmation.js
// Vercel Serverless Function — sends booking confirmation emails
// =============================================================
// REQUIRED ENV VARS (set in Vercel dashboard → Settings → Env):
//   EMAIL_HOST  = smtp.123-reg.co.uk  (or your SMTP host)
//   EMAIL_PORT  = 465
//   EMAIL_USER  = info@nscperformance.co.uk
//   EMAIL_PASS  = (your email password)
//   STAFF_EMAIL = info@nscperformance.co.uk  (staff notification recipient)
// =============================================================

const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      parentName, parentEmail, parentPhone,
      childName, childDob, childAgeGroup, medicalNotes,
      sessions, totalPaid, paymentRef
    } = req.body;

    const sessionListHTML = (sessions || []).map(s =>
      `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8f4fb;font-weight:600;color:#0D1B2A">${s.name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8f4fb;color:#4a6070">${s.date} at ${s.time}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8f4fb;color:#4a6070">${s.location}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8f4fb;font-weight:700;color:#00BFFF">${s.price}</td>
      </tr>`
    ).join('');

    const sessionListText = (sessions || []).map(s =>
      `• ${s.name} — ${s.date} at ${s.time} (${s.location})`
    ).join('\n');

    const parentHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booking Confirmed — NSC Performance</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0D1B2A 0%,#1a3a5c 100%);padding:32px 40px;text-align:center">
    <div style="color:#00BFFF;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">NSC PERFORMANCE</div>
    <div style="color:#ffffff;font-size:26px;font-weight:800;margin-bottom:4px">✅ Booking Confirmed!</div>
    <div style="color:#a0c4d8;font-size:15px">A place has been secured for ${childName}</div>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px">
    <p style="color:#2d4a5c;font-size:16px;margin:0 0 24px">Hi <strong>${parentName}</strong>,</p>
    <p style="color:#4a6070;font-size:15px;line-height:1.6;margin:0 0 28px">
      Great news! Your booking is confirmed and payment has been processed successfully. Here's a summary of everything you need to know:
    </p>

    <!-- Booking summary -->
    <div style="background:#f0f7ff;border-radius:10px;padding:20px 24px;margin-bottom:28px;border-left:4px solid #00BFFF">
      <div style="font-size:13px;font-weight:700;color:#00BFFF;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">Booking Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#d9edf7">
          <th style="padding:8px 14px;text-align:left;color:#0D1B2A;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Session</th>
          <th style="padding:8px 14px;text-align:left;color:#0D1B2A;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Date & Time</th>
          <th style="padding:8px 14px;text-align:left;color:#0D1B2A;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Location</th>
          <th style="padding:8px 14px;text-align:left;color:#0D1B2A;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Price</th>
        </tr>
        ${sessionListHTML}
      </table>
    </div>

    <!-- Payment info -->
    <div style="display:flex;gap:16px;margin-bottom:28px">
      <div style="flex:1;background:#f0fff4;border-radius:10px;padding:18px 20px;border:1px solid #b2e5c4">
        <div style="font-size:12px;font-weight:700;color:#22863a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Total Paid</div>
        <div style="font-size:24px;font-weight:800;color:#22863a">£${parseFloat(totalPaid || 0).toFixed(2)}</div>
      </div>
      <div style="flex:1;background:#f8f9fa;border-radius:10px;padding:18px 20px;border:1px solid #dee2e6">
        <div style="font-size:12px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Reference</div>
        <div style="font-size:15px;font-weight:700;color:#0D1B2A;font-family:monospace">${paymentRef || 'NSC-' + Date.now()}</div>
      </div>
    </div>

    <!-- Child details -->
    <div style="background:#fafafa;border-radius:10px;padding:20px 24px;margin-bottom:28px;border:1px solid #e8ecef">
      <div style="font-size:13px;font-weight:700;color:#6c757d;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">Participant Details</div>
      <div style="font-size:14px;color:#2d4a5c;line-height:2">
        <strong>Name:</strong> ${childName}<br>
        <strong>Age Group:</strong> ${childAgeGroup || '—'}<br>
        <strong>Date of Birth:</strong> ${childDob || '—'}
      </div>
    </div>

    ${medicalNotes ? `
    <div style="background:#fff8e1;border-radius:10px;padding:16px 20px;margin-bottom:28px;border:1px solid #ffd54f">
      <div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:8px">⚠ Medical Notes on File</div>
      <div style="font-size:14px;color:#5d4037">${medicalNotes}</div>
    </div>` : ''}

    <!-- What to bring -->
    <div style="background:#f0f4f8;border-radius:10px;padding:20px 24px;margin-bottom:28px">
      <div style="font-size:13px;font-weight:700;color:#0D1B2A;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">What to Bring</div>
      <div style="font-size:14px;color:#4a6070;line-height:1.9">
        ⚽ Football boots and shin pads<br>
        💧 Water bottle<br>
        👕 Appropriate sports kit<br>
        📋 Any required medication
      </div>
    </div>

    <p style="color:#4a6070;font-size:14px;line-height:1.7;margin:0 0 8px">
      Any questions? Get in touch with us at any time:
    </p>
    <p style="margin:0 0 32px">
      <a href="mailto:info@nscperformance.co.uk" style="color:#00BFFF;font-weight:700;font-size:15px">info@nscperformance.co.uk</a>
    </p>
    <p style="color:#4a6070;font-size:15px;line-height:1.6;margin:0">
      See you on the pitch! 🏆<br>
      <strong style="color:#0D1B2A">The NSC Performance Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#0D1B2A;padding:20px 40px;text-align:center">
    <div style="color:#4a7090;font-size:12px">NSC Performance · Harlow, Essex · info@nscperformance.co.uk</div>
  </div>
</div>
</body>
</html>`;

    const staffHTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Booking — NSC Staff</title></head>
<body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#0D1B2A;padding:24px 28px">
    <div style="color:#00BFFF;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">NSC PORTAL — STAFF NOTIFICATION</div>
    <div style="color:#fff;font-size:20px;font-weight:800">🆕 New Booking: ${childName}</div>
    <div style="color:#a0c4d8;font-size:13px">£${parseFloat(totalPaid || 0).toFixed(2)} received · Ref: ${paymentRef || '—'}</div>
  </div>
  <div style="padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#6c757d;width:140px">Parent</td><td style="padding:8px 0;font-weight:600;color:#0D1B2A">${parentName}</td></tr>
      <tr><td style="padding:8px 0;color:#6c757d">Email</td><td style="padding:8px 0;color:#0D1B2A">${parentEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#6c757d">Phone</td><td style="padding:8px 0;color:#0D1B2A">${parentPhone || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#6c757d">Child</td><td style="padding:8px 0;font-weight:600;color:#0D1B2A">${childName}</td></tr>
      <tr><td style="padding:8px 0;color:#6c757d">Age Group</td><td style="padding:8px 0;color:#0D1B2A">${childAgeGroup || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#6c757d">DOB</td><td style="padding:8px 0;color:#0D1B2A">${childDob || '—'}</td></tr>
      ${medicalNotes ? `<tr><td style="padding:8px 0;color:#e65100;font-weight:700">⚠ Medical</td><td style="padding:8px 0;color:#e65100;font-weight:600">${medicalNotes}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #e8ecef;margin:16px 0">
    <div style="font-size:13px;font-weight:700;color:#6c757d;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Sessions Booked</div>
    ${(sessions || []).map(s => `<div style="background:#f0f7ff;border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#0D1B2A"><strong>${s.name}</strong> · ${s.date} at ${s.time} · ${s.location} · <span style="color:#00BFFF;font-weight:700">${s.price}</span></div>`).join('')}
  </div>
</div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.123-reg.co.uk',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await Promise.all([
      transporter.sendMail({
        from: `"NSC Performance" <${process.env.EMAIL_USER}>`,
        to: parentEmail,
        subject: `✅ Booking Confirmed – ${childName} | NSC Performance`,
        text: `Hi ${parentName},\n\nYour booking for ${childName} is confirmed!\n\n${sessionListText}\n\nTotal paid: £${parseFloat(totalPaid || 0).toFixed(2)}\nReference: ${paymentRef || '—'}\n\nSee you on the pitch!\nNSC Performance\ninfo@nscperformance.co.uk`,
        html: parentHTML,
      }),
      transporter.sendMail({
        from: `"NSC Portal" <${process.env.EMAIL_USER}>`,
        to: process.env.STAFF_EMAIL || process.env.EMAIL_USER,
        subject: `🆕 New Booking: ${childName} — £${parseFloat(totalPaid || 0).toFixed(2)}`,
        html: staffHTML,
      }),
    ]);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Email failed: ' + err.message });
  }
};
