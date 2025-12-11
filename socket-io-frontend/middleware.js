// socket-io/middleware.js

const jwt = require("jsonwebtoken");

/**
 * Socket.IO auth middleware
 * Expects frontend to connect with:
 *   io("http://localhost:5000", { auth: { token: <JWT> } })
 */
function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    console.log("🔐 Incoming socket, has token?", !!token);

    if (!token) {
      console.log("❌ No token in socket handshake");
      return next(new Error("Authentication error: No token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔓 Decoded JWT for socket:", decoded);

    const userId = decoded.id || decoded.userId || decoded._id;

    socket.user = {
      id: userId,
      ...decoded,
    };

    if (!socket.user.id) {
      console.log("⚠️ Decoded token has no id / userId / _id");
    }

    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
}

module.exports = {
  socketAuthMiddleware,
};
