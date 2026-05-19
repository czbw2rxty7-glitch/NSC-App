// ============================================================
// FILE: netlify/functions/db.js
// ============================================================
// Handles all database operations securely on the server.
// The frontend calls this for every read/write operation.
//
// Required environment variables in Netlify:
//   SUPABASE_URL      = https://xxxx.supabase.co
//   SUPABASE_KEY      = your service role key (secret)
// ============================================================

const https = require("https");

// Simple Supabase REST API helper
function supabase(path, method, body) {
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
        "Prefer": method === "POST" ? "return=representation" : "return=representation"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }

  try {
    const { action, data } = JSON.parse(event.body);

    // ── PARENT: REGISTER ────────────────────────────────────
    if (action === "parent_register") {
      // Check email not already taken
      const check = await supabase(
        "parents?email=eq." + encodeURIComponent(data.email) + "&select=id",
        "GET"
      );
      if (check.data && check.data.length > 0) {
        return reply(400, { error: "An account with this email already exists." });
      }
      const result = await supabase("parents", "POST", {
        email: data.email,
        password_hash: data.password,
        first_name: data.first,
        last_name: data.last,
        phone: data.phone || ""
      });
      if (result.status !== 201) {
        return reply(500, { error: "Failed to create account." });
      }
      const parent = result.data[0];
      return reply(200, { success: true, user: {
        id: parent.id, email: parent.email,
        first: parent.first_name, last: parent.last_name,
        phone: parent.phone, children: []
      }});
    }

    // ── PARENT: LOGIN ────────────────────────────────────────
    if (action === "parent_login") {
      const result = await supabase(
        "parents?email=eq." + encodeURIComponent(data.email) + "&password_hash=eq." + encodeURIComponent(data.password) + "&select=*",
        "GET"
      );
      if (!result.data || result.data.length === 0) {
        return reply(401, { error: "Email or password incorrect." });
      }
      const parent = result.data[0];
      // Get their children
      const kidsResult = await supabase(
        "children?parent_id=eq." + parent.id + "&select=*",
        "GET"
      );
      const kids = (kidsResult.data || []).map(function(c) {
        return {
          id: c.id, first: c.first_name, last: c.last_name,
          dob: c.date_of_birth, ageGroup: c.age_group,
          medical: c.medical_notes || "", school: c.school || "",
          experience: c.experience || "", meds: c.medication || ""
        };
      });
      return reply(200, { success: true, user: {
        id: parent.id, email: parent.email,
        first: parent.first_name, last: parent.last_name,
        phone: parent.phone, children: kids
      }});
    }

    // ── STAFF: LOGIN ─────────────────────────────────────────
    if (action === "staff_login") {
      const result = await supabase(
        "staff?username=eq." + encodeURIComponent(data.username) + "&password_hash=eq." + encodeURIComponent(data.password) + "&select=*",
        "GET"
      );
      if (!result.data || result.data.length === 0) {
        return reply(401, { error: "Invalid username or password." });
      }
      const staff = result.data[0];
      return reply(200, { success: true, user: {
        id: staff.id, username: staff.username,
        name: staff.full_name, role: staff.role
      }});
    }

    // ── ADD CHILD ────────────────────────────────────────────
    if (action === "add_child") {
      const result = await supabase("children", "POST", {
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
        return reply(500, { error: "Failed to add child." });
      }
      const c = result.data[0];
      return reply(200, { success: true, child: {
        id: c.id, first: c.first_name, last: c.last_name,
        dob: c.date_of_birth, ageGroup: c.age_group,
        medical: c.medical_notes || ""
      }});
    }

    // ── REMOVE CHILD ─────────────────────────────────────────
    if (action === "remove_child") {
      await supabase("children?id=eq." + data.childId, "DELETE");
      return reply(200, { success: true });
    }

    // ── GET SESSIONS ─────────────────────────────────────────
    if (action === "get_sessions") {
      const today = new Date().toISOString().split("T")[0];
      const result = await supabase(
        "sessions?active=eq.true&date=gte." + today + "&order=date.asc&select=*",
        "GET"
      );
      // Get booking counts for each session
      const sessions = result.data || [];
      const sessionIds = sessions.map(function(s) { return s.id; });
      let bookingCounts = {};
      if (sessionIds.length > 0) {
        const bResult = await supabase(
          "bookings?session_id=in.(" + sessionIds.join(",") + ")&status=eq.paid&select=session_id",
          "GET"
        );
        (bResult.data || []).forEach(function(b) {
          bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
        });
      }
      return reply(200, { success: true, sessions: sessions.map(function(s) {
        return {
          id: s.id, name: s.name, type: s.type, date: s.date,
          time: s.time, location: s.location, ageGroup: s.age_group,
          capacity: s.capacity, price: parseFloat(s.price),
          notes: s.notes || "", bookingCount: bookingCounts[s.id] || 0
        };
      })});
    }

    // ── GET ALL SESSIONS (staff) ──────────────────────────────
    if (action === "get_all_sessions") {
      const result = await supabase("sessions?order=date.asc&select=*", "GET");
      const sessions = result.data || [];
      const sessionIds = sessions.map(function(s) { return s.id; });
      let bookingCounts = {};
      if (sessionIds.length > 0) {
        const bResult = await supabase(
          "bookings?session_id=in.(" + sessionIds.join(",") + ")&status=eq.paid&select=session_id",
          "GET"
        );
        (bResult.data || []).forEach(function(b) {
          bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
        });
      }
      return reply(200, { success: true, sessions: sessions.map(function(s) {
        return {
          id: s.id, name: s.name, type: s.type, date: s.date,
          time: s.time, location: s.location, ageGroup: s.age_group,
          capacity: s.capacity, price: parseFloat(s.price),
          notes: s.notes || "", active: s.active,
          bookingCount: bookingCounts[s.id] || 0
        };
      })});
    }

    // ── CREATE SESSION ────────────────────────────────────────
    if (action === "create_session") {
      const result = await supabase("sessions", "POST", {
        name: data.name, type: data.type, date: data.date,
        time: data.time, location: data.location,
        age_group: data.ageGroup, capacity: data.capacity,
        price: data.price, notes: data.notes || "", active: true
      });
      if (result.status !== 201) {
        return reply(500, { error: "Failed to create session." });
      }
      return reply(200, { success: true, session: result.data[0] });
    }

    // ── UPDATE SESSION ────────────────────────────────────────
    if (action === "update_session") {
      const result = await supabase("sessions?id=eq." + data.id, "PATCH", {
        name: data.name, type: data.type, date: data.date,
        time: data.time, location: data.location,
        age_group: data.ageGroup, capacity: data.capacity,
        price: data.price, notes: data.notes || ""
      });
      return reply(200, { success: true });
    }

    // ── DELETE SESSION ────────────────────────────────────────
    if (action === "delete_session") {
      await supabase("sessions?id=eq." + data.id, "DELETE");
      return reply(200, { success: true });
    }

    // ── CREATE BOOKING ────────────────────────────────────────
    if (action === "create_booking") {
      const result = await supabase("bookings", "POST", {
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
        return reply(500, { error: "Failed to save booking." });
      }
      // Also log in payments table
      await supabase("payments", "POST", {
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
      return reply(200, { success: true, booking: result.data[0] });
    }

    // ── GET MY BOOKINGS (parent) ──────────────────────────────
    if (action === "get_my_bookings") {
      const result = await supabase(
        "bookings?parent_id=eq." + data.parentId + "&order=created_at.desc&select=*,sessions(name,date,time,location,price)",
        "GET"
      );
      return reply(200, { success: true, bookings: result.data || [] });
    }

    // ── GET ALL BOOKINGS (staff) ──────────────────────────────
    if (action === "get_all_bookings") {
      const result = await supabase(
        "bookings?order=created_at.desc&select=*,sessions(name,date,time)",
        "GET"
      );
      return reply(200, { success: true, bookings: result.data || [] });
    }

    // ── GET ALL PAYMENTS (staff) ──────────────────────────────
    if (action === "get_all_payments") {
      const result = await supabase(
        "payments?order=created_at.desc&select=*",
        "GET"
      );
      return reply(200, { success: true, payments: result.data || [] });
    }

    // ── GET ALL PLAYERS (staff) ───────────────────────────────
    if (action === "get_all_players") {
      const result = await supabase(
        "children?select=*,parents(email,phone,first_name,last_name)",
        "GET"
      );
      return reply(200, { success: true, players: (result.data || []).map(function(c) {
        return {
          id: c.id, first: c.first_name, last: c.last_name,
          dob: c.date_of_birth, ageGroup: c.age_group,
          medical: c.medical_notes || "", status: "active",
          parent: c.parents ? c.parents.first_name + " " + c.parents.last_name : "",
          email: c.parents ? c.parents.email : "",
          phone: c.parents ? c.parents.phone : ""
        };
      })});
    }

    // ── MARK ATTENDANCE ───────────────────────────────────────
    if (action === "mark_attendance") {
      // Delete existing record first
      await supabase(
        "attendance?session_id=eq." + data.sessionId + "&player_name=eq." + encodeURIComponent(data.playerName),
        "DELETE"
      );
      // Insert new record
      if (data.status) {
        await supabase("attendance", "POST", {
          session_id: data.sessionId,
          player_name: data.playerName,
          parent_email: data.parentEmail || "",
          status: data.status
        });
      }
      return reply(200, { success: true });
    }

    // ── GET ATTENDANCE ────────────────────────────────────────
    if (action === "get_attendance") {
      const result = await supabase(
        "attendance?session_id=eq." + data.sessionId + "&select=*",
        "GET"
      );
      return reply(200, { success: true, attendance: result.data || [] });
    }

    // ── GET DASHBOARD STATS ───────────────────────────────────
    if (action === "get_stats") {
      const [players, payments, sessions, bookings] = await Promise.all([
        supabase("children?select=id", "GET"),
        supabase("payments?status=eq.paid&select=amount", "GET"),
        supabase("sessions?active=eq.true&date=gte." + new Date().toISOString().split("T")[0] + "&select=id", "GET"),
        supabase("bookings?select=id", "GET")
      ]);
      const revenue = (payments.data || []).reduce(function(a, p) { return a + parseFloat(p.amount); }, 0);
      return reply(200, { success: true, stats: {
        totalPlayers: (players.data || []).length,
        totalRevenue: revenue,
        upcomingSessions: (sessions.data || []).length,
        totalBookings: (bookings.data || []).length
      }});
    }

    return reply(400, { error: "Unknown action: " + action });

  } catch (err) {
    console.error("DB error:", err.message);
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
