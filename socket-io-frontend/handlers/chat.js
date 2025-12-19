// socket-io/handlers/chat.js
function registerChatHandlers(io, socket) {
  // ping/pong
  socket.on("ping", () => {
    console.log("📡 ping from user:", socket.user?.id);
    socket.emit("pong", { userId: socket.user?.id, serverTime: new Date().toISOString() });
  });

  // public broadcast message
  socket.on("broadcast_message", (data) => {
    try {
      const text = String((data && data.text) || "").trim();
      if (!text) return;
      const msg = { from: socket.user?.id, text, created_at: new Date().toISOString(), fromName: socket.user?.name };
      io.emit("broadcast_message", msg);
    } catch (err) {
      console.error("broadcast_message error:", err && err.message);
    }
  });
}

module.exports = { registerChatHandlers };
