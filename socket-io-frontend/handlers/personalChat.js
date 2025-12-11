// socket-io/handlers/personalChat.js

const { pool } = require("../../config/db");

/**
 * Ensure personal_messages table exists.
 */
async function ensureTable() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS personal_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(100) NOT NULL,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(createSql);
}

/**
 * Register personal chat handlers
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerPersonalChatHandlers(io, socket) {
  // Ensure table (fire-and-forget)
  ensureTable().catch((err) => {
    console.error("Error ensuring personal_messages table:", err.message);
  });

  // join_room
  socket.on("join_room", (payload = {}) => {
    console.log("join_room payload:", payload, "socket.user:", socket.user?.id, "socket.id:", socket.id);
    const { roomId } = payload;
    if (!roomId) return;

    try {
      socket.join(roomId);
      // ack the join
      socket.emit("joined_room", { roomId });
      console.log(`User ${socket.user?.id} joined room ${roomId} — socket.rooms:`, Array.from(socket.rooms));
    } catch (err) {
      console.error("join_room error:", err.message);
    }
  });

  // new_message
  socket.on("new_message", async (payload = {}) => {
    try {
      console.log("new_message payload RECEIVED on server:", payload, "socket.user:", socket.user?.id);

      const senderId = socket.user?.id;
      if (!senderId) {
        socket.emit("error_message", { message: "Not authenticated" });
        return;
      }

      // normalize incoming fields
      const roomId = payload.roomId || payload.room_id;
      const text = payload.text || payload.message;
      const to = payload.to || payload.receiver_id;

      if (!roomId || !text || !to) {
        socket.emit("error_message", { message: "Invalid message payload" });
        return;
      }

      const trimmed = String(text).trim();
      if (!trimmed) {
        socket.emit("error_message", { message: "Message is empty" });
        return;
      }

      // Save to DB
      const insertSql =
        "INSERT INTO personal_messages (room_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)";
      const [result] = await pool.query(insertSql, [
        roomId,
        senderId,
        to,
        trimmed,
      ]);

      const nowIso = new Date().toISOString();
      const saved = {
        id: result.insertId,
        room_id: roomId,
        roomId,                    // alias for client
        sender_id: senderId,
        from: senderId,            // alias for client
        receiver_id: to,
        to,                        // alias for client
        message: trimmed,
        created_at: nowIso,
        createdAt: nowIso
      };

      console.log("Saved personal message:", saved);

      // Emit to everyone in the room (including sender)
      io.to(roomId).emit("new_message", saved);
      console.log("Emitted new_message to room", roomId);

      // Acknowledge sender
      socket.emit("message_sent", saved);
    } catch (err) {
      console.error("new_message handler error:", err.message);
      socket.emit("error_message", { message: "Server error sending message" });
    }
  });
}

module.exports = {
  registerPersonalChatHandlers,
};
