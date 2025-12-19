// socket-io/handlers/personalChat.js
const { pool } = require("../../config/db");

async function ensureTable() {
  // table created in config/db init; keep for safety
  const sql = `
    CREATE TABLE IF NOT EXISTS personal_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(255) NOT NULL,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
}

function registerPersonalChatHandlers(io, socket) {
  ensureTable().catch((err) => console.error("ensure personal_messages table:", err && err.message));

  socket.on("join_room", ({ roomId } = {}) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.emit("joined_room", { roomId });
    console.log(`User ${socket.user?.id} joined room ${roomId}`);
  });

  socket.on("new_message", async (payload = {}) => {
    try {
      const senderId = socket.user?.id;
      if (!senderId) return socket.emit("error_message", { message: "Not authenticated" });

      const { roomId, text, to } = payload;
      if (!roomId || !text || !to) return socket.emit("error_message", { message: "Invalid message payload" });

      const trimmed = String(text).trim();
      if (!trimmed) return socket.emit("error_message", { message: "Message is empty" });

      const [result] = await pool.query(
        "INSERT INTO personal_messages (room_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
        [roomId, senderId, to, trimmed]
      );

      const saved = {
        id: result.insertId,
        roomId,
        room_id: roomId,
        sender_id: senderId,
        from: senderId,
        fromName: socket.user?.name,
        receiver_id: to,
        to,
        message: trimmed,
        created_at: new Date().toISOString(),
      };

      io.to(roomId).emit("new_message", saved);
      socket.emit("message_sent", saved);
    } catch (err) {
      console.error("personal new_message error:", err && err.message);
      socket.emit("error_message", { message: "Server error sending message" });
    }
  });
}

module.exports = { registerPersonalChatHandlers };
