// ============================================================
// FILE: api/send-confirmation.js
// Vercel serverless function — sends booking confirmation emails
//
// Required environment variables (set in Vercel dashboard):
//   EMAIL_HOST  = smtp.123-reg.co.uk
//   EMAIL_PORT  = 465
//   EMAIL_USER  = info@nscperformance.co.uk
//   EMAIL_PASS  = your email password
//   STAFF_EMAIL = nathanielsteed.coaching@outlook.com
// ============================================================

const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const {
      parentName,
      parentEmail,
      childName,
      childAge,
      sessions,
      totalPaid,
      paymentRef,
      medicalNotes
    } = req.body;

    // Build session rows for email table
    const sessionRowsHTML = sessions.map(function(s) {
      return "<tr>" +
        "<td style=\"padding:10px 14px;border-bottom:1px solid #e2e8f0;\">" +
        "<strong>" + s.name + "</strong><br>" +
        "<span style=\"color:#64748b;font-size:13px\">" + s.date + " · " + s.time + "<br>📍 " + s.location + "</span>" +
        "</td>" +
        "<td style=\"padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0d9488;\">" +
        "£" + parseFloat(s.price).toFixed(2) +
        "</td></tr>";
    }).join("");

    const sessionListText = sessions.map(function(s) {
      return "• " + s.name + " — " + s.date + " at " + s.time + ", " + s.location;
    }).join("\n");

    // Parent confirmation email
    const parentHTML = "<!DOCTYPE html>" +
      "<html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>" +
      "<body style=\"margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\">" +
      "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding:32px 16px;\">" +
      "<tr><td align=\"center\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;\">" +
      "<tr><td style=\"background:#0d1b2a;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;\">" +
      "<div style=\"display:inline-block;background:#00c2e0;border-radius:10px;padding:8px 16px;font-size:18px;font-weight:900;color:#0d1b2a;margin-bottom:14px;\">NSC</div>" +
      "<h1 style=\"color:#f4f7fa;font-size:24px;font-weight:800;margin:0 0 4px;\">Booking Confirmed! 🎉</h1>" +
      "<p style=\"color:#6a8aa8;font-size:14px;margin:0;\">NSC Performance · Youth Football Coaching · Harlow</p>" +
      "</td></tr>" +
      "<tr><td style=\"background:#ffffff;padding:28px 32px;\">" +
      "<p style=\"font-size:16px;color:#1e293b;margin:0 0 6px;\">Hi " + parentName + ",</p>" +
      "<p style=\"font-size:15px;color:#475569;margin:0 0 24px;line-height:1.6;\">Great news — <strong>" + childName + "</strong>'s booking is confirmed!</p>" +
      "<h2 style=\"font-size:15px;font-weight:700;color:#0d1b2a;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;\">Sessions Booked</h2>" +
      "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;\">" +
      sessionRowsHTML +
      "<tr style=\"background:#f8fafc;\"><td style=\"padding:12px 14px;font-weight:700;color:#0d1b2a;\">Total Paid</td>" +
      "<td style=\"padding:12px 14px;text-align:right;font-weight:800;font-size:18px;color:#0d9488;\">£" + parseFloat(totalPaid).toFixed(2) + "</td></tr>" +
      "</table>" +
      "<p style=\"font-size:12px;color:#94a3b8;margin:0 0 22px;\">Payment reference: <code style=\"background:#f1f5f9;padding:2px 6px;border-radius:4px;\">" + paymentRef + "</code></p>" +
      "<h2 style=\"font-size:15px;font-weight:700;color:#0d1b2a;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;\">What to Bring</h2>" +
      "<ul style=\"color:#475569;font-size:14px;line-height:2.2;margin:0 0 22px;padding-left:20px;\">" +
      "<li>Football boots or trainers</li><li>Shin pads</li><li>Water bottle</li><li>Appropriate sportswear</li>" +
      (medicalNotes && medicalNotes.toLowerCase() !== "none" ? "<li><strong>Any medication noted on your registration form</strong></li>" : "") +
      "</ul>" +
      "<div style=\"background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:14px;margin-bottom:20px;\">" +
      "<p style=\"font-size:14px;color:#0f766e;margin:0;line-height:1.7;\">⚽ Please arrive 5 minutes before the session.<br>📧 To cancel, contact us at least 24 hours before.<br>📞 Questions? info@nscperformance.co.uk</p>" +
      "</div>" +
      (medicalNotes && medicalNotes.toLowerCase() !== "none" ?
        "<div style=\"background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-bottom:20px;\">" +
        "<p style=\"font-size:13px;color:#92400e;margin:0;\"><strong>⚠ Medical notes on file:</strong> " + medicalNotes + "</p>" +
        "<p style=\"font-size:12px;color:#92400e;margin:6px 0 0;\">Our coaches have been made aware. Please ensure your child carries any required medication.</p>" +
        "</div>" : "") +
      "</td></tr>" +
      "<tr><td style=\"background:#0d1b2a;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;\">" +
      "<p style=\"color:#6a8aa8;font-size:13px;margin:0 0 4px;\">NSC Performance · Harlow, Essex</p>" +
      "<a href=\"mailto:info@nscperformance.co.uk\" style=\"color:#00c2e0;font-size:13px;text-decoration:none;\">info@nscperformance.co.uk</a>" +
      "<p style=\"color:#6a8aa8;font-size:11px;margin:10px 0 0;\"><a href=\"https://nscperformance.co.uk\" style=\"color:#6a8aa8;text-decoration:none;\">nscperformance.co.uk</a></p>" +
      "</td></tr></table></td></tr></table></body></html>";

    // Staff notification email
    const staffHTML = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>" +
      "<body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;background:#f1f5f9;\">" +
      "<div style=\"max-width:480px;background:#fff;border-radius:10px;padding:24px;border:1px solid #e2e8f0;\">" +
      "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:20px;\">" +
      "<div style=\"background:#00c2e0;border-radius:8px;padding:6px 12px;font-weight:900;color:#0d1b2a;font-size:15px;\">NSC</div>" +
      "<div><h2 style=\"margin:0;color:#0d1b2a;font-size:18px;\">New Booking Received</h2>" +
      "<p style=\"margin:0;color:#64748b;font-size:12px;\">" + new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }) + "</p></div></div>" +
      "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\">" +
      "<tr><td style=\"padding:6px 0;color:#64748b;font-size:13px;width:110px;\">Child</td><td style=\"font-weight:700;font-size:14px;color:#0d1b2a;\">" + childName + " (" + childAge + ")</td></tr>" +
      "<tr><td style=\"padding:6px 0;color:#64748b;font-size:13px;\">Parent</td><td style=\"font-size:14px;color:#0d1b2a;\">" + parentName + "</td></tr>" +
      "<tr><td style=\"padding:6px 0;color:#64748b;font-size:13px;\">Email</td><td><a href=\"mailto:" + parentEmail + "\" style=\"color:#0d9488;font-size:13px;\">" + parentEmail + "</a></td></tr>" +
      "<tr><td style=\"padding:6px 0;color:#64748b;font-size:13px;\">Amount</td><td style=\"font-weight:800;color:#0d9488;font-size:18px;\">£" + parseFloat(totalPaid).toFixed(2) + "</td></tr>" +
      "<tr><td style=\"padding:6px 0;color:#64748b;font-size:13px;\">Ref</td><td style=\"font-family:monospace;font-size:11px;color:#64748b;\">" + paymentRef + "</td></tr>" +
      "</table>" +
      "<div style=\"background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:14px;\">" +
      "<div style=\"font-weight:700;font-size:13px;color:#0d1b2a;margin-bottom:8px;\">Sessions booked:</div>" +
      sessions.map(function(s) {
        return "<div style=\"font-size:13px;padding:5px 0;border-bottom:1px solid #e2e8f0;color:#475569;\"><strong style=\"color:#0d1b2a\">" + s.name + "</strong> — " + s.date + " at " + s.time + "</div>";
      }).join("") +
      "</div>" +
      (medicalNotes && medicalNotes.toLowerCase() !== "none" ?
        "<div style=\"background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;\">" +
        "<strong style=\"color:#92400e;font-size:13px;\">⚠ Medical Notes — read before session:</strong>" +
        "<p style=\"color:#92400e;margin:6px 0 0;font-size:13px;\">" + medicalNotes + "</p></div>" : "") +
      "</div></body></html>";

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.123-reg.co.uk",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await Promise.all([
      transporter.sendMail({
        from: "\"NSC Performance\" <" + process.env.EMAIL_USER + ">",
        to: parentEmail,
        subject: "✅ Booking Confirmed – " + childName + " | NSC Performance",
        text: "Hi " + parentName + ",\n\nYour booking for " + childName + " is confirmed!\n\n" + sessionListText + "\n\nTotal paid: £" + parseFloat(totalPaid).toFixed(2) + "\nReference: " + paymentRef + "\n\nSee you on the pitch!\nNSC Performance\ninfo@nscperformance.co.uk",
        html: parentHTML
      }),
      transporter.sendMail({
        from: "\"NSC Portal\" <" + process.env.EMAIL_USER + ">",
        to: process.env.STAFF_EMAIL || process.env.EMAIL_USER,
        subject: "🆕 New Booking: " + childName + " — £" + parseFloat(totalPaid).toFixed(2),
        html: staffHTML
      })
    ]);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Email error:", err.message);
    res.status(500).json({ error: "Email failed: " + err.message });
  }
};
