// socket-io/middleware.js
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || "").split(" ")[1];
    console.log("🔐 Incoming socket, has token?", !!token);

    if (!token) return next(new Error("Authentication error: No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id };

    // fetch user name+email
    const [rows] = await pool.query("SELECT id, name, email FROM users WHERE id = ? LIMIT 1", [decoded.id]);
    if (rows && rows.length) {
      socket.user.name = rows[0].name;
      socket.user.email = rows[0].email;
    }

    console.log("🔓 Decoded JWT:", socket.user);
    next();
  } catch (err) {
    console.error("Socket auth error:", err && err.message);
    next(new Error("Authentication error"));
  }
}

module.exports = { socketAuthMiddleware };
