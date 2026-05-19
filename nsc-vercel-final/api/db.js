// ============================================================
// FILE: api/db.js
// Vercel serverless function — handles all database operations
//
// Required environment variables (set in Vercel dashboard):
//   SUPABASE_URL = https://cthlcrpxwajydosuacsh.supabase.co
//   SUPABASE_KEY = your service_role secret key
// ============================================================

const https = require("https");

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.SUPABASE_URL + "/rest/v1/" + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_KEY,
        "Authorization": "Bearer " + process.env.SUPABASE_KEY,
        "Prefer": "return=representation"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const { action, data } = req.body;

    // ── PARENT: REGISTER ──────────────────────────────────────
    if (action === "parent_register") {
      const check = await supabaseRequest(
        "parents?email=eq." + encodeURIComponent(data.email) + "&select=id", "GET"
      );
      if (check.data && check.data.length > 0) {
        res.status(400).json({ error: "An account with this email already exists." });
        return;
      }
      const result = await supabaseRequest("parents", "POST", {
        email: data.email,
        password_hash: data.password,
        first_name: data.first,
        last_name: data.last,
        phone: data.phone || ""
      });
      if (result.status !== 201) {
        res.status(500).json({ error: "Failed to create account." });
        return;
      }
      const parent = result.data[0];
      res.status(200).json({
        success: true,
        user: {
          id: parent.id,
          email: parent.email,
          first: parent.first_name,
          last: parent.last_name,
          phone: parent.phone,
          children: []
        }
      });
      return;
    }

    // ── PARENT: LOGIN ─────────────────────────────────────────
    if (action === "parent_login") {
      const result = await supabaseRequest(
        "parents?email=eq." + encodeURIComponent(data.email) +
        "&password_hash=eq." + encodeURIComponent(data.password) + "&select=*",
        "GET"
      );
      if (!result.data || result.data.length === 0) {
        res.status(401).json({ error: "Email or password incorrect." });
        return;
      }
      const parent = result.data[0];
      const kidsResult = await supabaseRequest(
        "children?parent_id=eq." + parent.id + "&select=*", "GET"
      );
      const kids = (kidsResult.data || []).map(function(c) {
        return {
          id: c.id,
          first: c.first_name,
          last: c.last_name,
          dob: c.date_of_birth,
          ageGroup: c.age_group,
          medical: c.medical_notes || "",
          school: c.school || "",
          experience: c.experience || "",
          meds: c.medication || ""
        };
      });
      res.status(200).json({
        success: true,
        user: {
          id: parent.id,
          email: parent.email,
          first: parent.first_name,
          last: parent.last_name,
          phone: parent.phone,
          children: kids
        }
      });
      return;
    }

    // ── STAFF: LOGIN ──────────────────────────────────────────
    if (action === "staff_login") {
      const result = await supabaseRequest(
        "staff?username=eq." + encodeURIComponent(data.username) +
        "&password_hash=eq." + encodeURIComponent(data.password) + "&select=*",
        "GET"
      );
      if (!result.data || result.data.length === 0) {
        res.status(401).json({ error: "Invalid username or password." });
        return;
      }
      const staff = result.data[0];
      res.status(200).json({
        success: true,
        user: {
          id: staff.id,
          username: staff.username,
          name: staff.full_name,
          role: staff.role
        }
      });
      return;
    }

    // ── ADD CHILD ─────────────────────────────────────────────
    if (action === "add_child") {
      const result = await supabaseRequest("children", "POST", {
        parent_id: data.parentId,
        first_name: data.first,
        last_name: data.last,
        date_of_birth: data.dob || null,
        age_group: data.ageGroup,
        medical_notes: data.medical || "",
        school: data.school || "",
        experience: data.experience || "",
        medication: data.meds || ""
      });
      if (result.status !== 201) {
        res.status(500).json({ error: "Failed to add child." });
        return;
      }
      const c = result.data[0];
      res.status(200).json({
        success: true,
        child: {
          id: c.id,
          first: c.first_name,
          last: c.last_name,
          dob: c.date_of_birth,
          ageGroup: c.age_group,
          medical: c.medical_notes || ""
        }
      });
      return;
    }

    // ── REMOVE CHILD ──────────────────────────────────────────
    if (action === "remove_child") {
      await supabaseRequest("children?id=eq." + data.childId, "DELETE");
      res.status(200).json({ success: true });
      return;
    }

    // ── GET SESSIONS (parent — upcoming only) ─────────────────
    if (action === "get_sessions") {
      const today = new Date().toISOString().split("T")[0];
      const result = await supabaseRequest(
        "sessions?active=eq.true&date=gte." + today + "&order=date.asc&select=*", "GET"
      );
      const sessions = result.data || [];
      let bookingCounts = {};
      if (sessions.length > 0) {
        const ids = sessions.map(function(s) { return s.id; }).join(",");
        const bResult = await supabaseRequest(
          "bookings?session_id=in.(" + ids + ")&status=eq.paid&select=session_id", "GET"
        );
        (bResult.data || []).forEach(function(b) {
          bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
        });
      }
      res.status(200).json({
        success: true,
        sessions: sessions.map(function(s) {
          return {
            id: s.id,
            name: s.name,
            type: s.type,
            date: s.date,
            time: s.time,
            location: s.location,
            ageGroup: s.age_group,
            capacity: s.capacity,
            price: parseFloat(s.price),
            notes: s.notes || "",
            bookingCount: bookingCounts[s.id] || 0
          };
        })
      });
      return;
    }

    // ── GET ALL SESSIONS (staff) ──────────────────────────────
    if (action === "get_all_sessions") {
      const result = await supabaseRequest(
        "sessions?order=date.asc&select=*", "GET"
      );
      const sessions = result.data || [];
      let bookingCounts = {};
      if (sessions.length > 0) {
        const ids = sessions.map(function(s) { return s.id; }).join(",");
        const bResult = await supabaseRequest(
          "bookings?session_id=in.(" + ids + ")&status=eq.paid&select=session_id", "GET"
        );
        (bResult.data || []).forEach(function(b) {
          bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
        });
      }
      res.status(200).json({
        success: true,
        sessions: sessions.map(function(s) {
          return {
            id: s.id,
            name: s.name,
            type: s.type,
            date: s.date,
            time: s.time,
            location: s.location,
            ageGroup: s.age_group,
            capacity: s.capacity,
            price: parseFloat(s.price),
            notes: s.notes || "",
            active: s.active,
            bookingCount: bookingCounts[s.id] || 0
          };
        })
      });
      return;
    }

    // ── CREATE SESSION ────────────────────────────────────────
    if (action === "create_session") {
      const result = await supabaseRequest("sessions", "POST", {
        name: data.name,
        type: data.type,
        date: data.date,
        time: data.time,
        location: data.location,
        age_group: data.ageGroup,
        capacity: data.capacity,
        price: data.price,
        notes: data.notes || "",
        active: true
      });
      if (result.status !== 201) {
        res.status(500).json({ error: "Failed to create session." });
        return;
      }
      res.status(200).json({ success: true, session: result.data[0] });
      return;
    }

    // ── UPDATE SESSION ────────────────────────────────────────
    if (action === "update_session") {
      await supabaseRequest("sessions?id=eq." + data.id, "PATCH", {
        name: data.name,
        type: data.type,
        date: data.date,
        time: data.time,
        location: data.location,
        age_group: data.ageGroup,
        capacity: data.capacity,
        price: data.price,
        notes: data.notes || ""
      });
      res.status(200).json({ success: true });
      return;
    }

    // ── DELETE SESSION ────────────────────────────────────────
    if (action === "delete_session") {
      await supabaseRequest("sessions?id=eq." + data.id, "DELETE");
      res.status(200).json({ success: true });
      return;
    }

    // ── CREATE BOOKING ────────────────────────────────────────
    if (action === "create_booking") {
      const result = await supabaseRequest("bookings", "POST", {
        parent_id: data.parentId,
        child_id: data.childId,
        session_id: data.sessionId,
        child_name: data.childName,
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        amount: data.amount,
        status: "paid",
        payment_method: data.method,
        payment_ref: data.ref,
        payment_intent_id: data.paymentIntentId || "",
        consents: data.consents || {}
      });
      if (result.status !== 201) {
        res.status(500).json({ error: "Failed to save booking." });
        return;
      }
      await supabaseRequest("payments", "POST", {
        booking_id: result.data[0].id,
        parent_id: data.parentId,
        session_id: data.sessionId,
        child_name: data.childName,
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        session_name: data.sessionName,
        amount: data.amount,
        status: "paid",
        method: data.method,
        stripe_ref: data.ref
      });
      res.status(200).json({ success: true, booking: result.data[0] });
      return;
    }

    // ── GET MY BOOKINGS (parent) ──────────────────────────────
    if (action === "get_my_bookings") {
      const result = await supabaseRequest(
        "bookings?parent_id=eq." + data.parentId +
        "&order=created_at.desc&select=*,sessions(name,date,time,location,price)",
        "GET"
      );
      res.status(200).json({ success: true, bookings: result.data || [] });
      return;
    }

    // ── GET ALL PAYMENTS (staff) ──────────────────────────────
    if (action === "get_all_payments") {
      const result = await supabaseRequest(
        "payments?order=created_at.desc&select=*", "GET"
      );
      res.status(200).json({ success: true, payments: result.data || [] });
      return;
    }

    // ── GET ALL PLAYERS (staff) ───────────────────────────────
    if (action === "get_all_players") {
      const result = await supabaseRequest(
        "children?select=*,parents(email,phone,first_name,last_name)", "GET"
      );
      res.status(200).json({
        success: true,
        players: (result.data || []).map(function(c) {
          return {
            id: c.id,
            first: c.first_name,
            last: c.last_name,
            dob: c.date_of_birth,
            ageGroup: c.age_group,
            medical: c.medical_notes || "",
            status: "active",
            parent: c.parents ? c.parents.first_name + " " + c.parents.last_name : "",
            email: c.parents ? c.parents.email : "",
            phone: c.parents ? c.parents.phone : ""
          };
        })
      });
      return;
    }

    // ── MARK ATTENDANCE ───────────────────────────────────────
    if (action === "mark_attendance") {
      await supabaseRequest(
        "attendance?session_id=eq." + data.sessionId +
        "&player_name=eq." + encodeURIComponent(data.playerName),
        "DELETE"
      );
      if (data.status) {
        await supabaseRequest("attendance", "POST", {
          session_id: data.sessionId,
          player_name: data.playerName,
          parent_email: data.parentEmail || "",
          status: data.status
        });
      }
      res.status(200).json({ success: true });
      return;
    }

    // ── GET ATTENDANCE ────────────────────────────────────────
    if (action === "get_attendance") {
      const result = await supabaseRequest(
        "attendance?session_id=eq." + data.sessionId + "&select=*", "GET"
      );
      res.status(200).json({ success: true, attendance: result.data || [] });
      return;
    }

    // ── GET DASHBOARD STATS ───────────────────────────────────
    if (action === "get_stats") {
      const today = new Date().toISOString().split("T")[0];
      const [players, payments, sessions, bookings] = await Promise.all([
        supabaseRequest("children?select=id", "GET"),
        supabaseRequest("payments?status=eq.paid&select=amount", "GET"),
        supabaseRequest("sessions?active=eq.true&date=gte." + today + "&select=id", "GET"),
        supabaseRequest("bookings?select=id", "GET")
      ]);
      const revenue = (payments.data || []).reduce(function(a, p) {
        return a + parseFloat(p.amount);
      }, 0);
      res.status(200).json({
        success: true,
        stats: {
          totalPlayers: (players.data || []).length,
          totalRevenue: revenue,
          upcomingSessions: (sessions.data || []).length,
          totalBookings: (bookings.data || []).length
        }
      });
      return;
    }

    res.status(400).json({ error: "Unknown action: " + action });

  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
