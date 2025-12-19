// socket-io/handlers/groupChat.js
const { pool } = require("../../config/db");

async function ensureGroupTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS group_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
}

function registerGroupChatHandlers(io, socket) {
  ensureGroupTables().catch((err) => console.warn("ensureGroupTables:", err && err.message));

  socket.on("group_join", ({ groupId } = {}) => {
    if (!groupId) return;
    const room = `group:${groupId}`;
    socket.join(room);
    socket.emit("group_joined", { groupId });
    io.to(room).emit("group_member_joined", { groupId, userId: socket.user?.id, name: socket.user?.name });
    // publish members
    publishGroupMembers(io, groupId);
  });

  socket.on("group_leave", ({ groupId } = {}) => {
    if (!groupId) return;
    const room = `group:${groupId}`;
    socket.leave(room);
    socket.emit("group_left", { groupId });
    io.to(room).emit("group_member_left", { groupId, userId: socket.user?.id });
    publishGroupMembers(io, groupId);
  });

  socket.on("group_message", async (payload = {}) => {
    try {
      const { groupId, text } = payload;
      if (!groupId || !text || !String(text).trim()) return;
      const room = `group:${groupId}`;
      const trimmed = String(text).trim();

      const [result] = await pool.query(
        "INSERT INTO group_messages (group_id, sender_id, message) VALUES (?, ?, ?)",
        [groupId, socket.user?.id, trimmed]
      );

      const saved = {
        id: result.insertId,
        group_id: groupId,
        sender_id: socket.user?.id,
        sender_name: socket.user?.name,
        message: trimmed,
        created_at: new Date().toISOString(),
      };

      io.to(room).emit("group_message", saved);
    } catch (err) {
      console.error("group_message error:", err && err.message);
      socket.emit("error", { message: "Failed to send group message" });
    }
  });

  async function publishGroupMembers(io, groupId) {
    try {
      const room = `group:${groupId}`;
      const socketIds = await io.in(room).allSockets();
      const members = Array.from(socketIds).map((sid) => {
        const s = io.sockets.sockets.get(sid);
        return s && s.user ? { socketId: sid, userId: s.user.id, name: s.user.name } : null;
      }).filter(Boolean);

      io.to(room).emit("group_members", { groupId, members });
    } catch (err) {
      console.error("publishGroupMembers:", err && err.message);
    }
  }
}

module.exports = { registerGroupChatHandlers };
