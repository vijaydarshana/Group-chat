// socket-io/handlers/chat.js

/**
 * Register chat-related handlers for a socket
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerChatHandlers(io, socket) {
  // Example: ping/pong event
  socket.on("ping", () => {
    console.log("📡 ping from user:", socket.user?.id);
    socket.emit("pong", { userId: socket.user?.id });
  });

  // 👇 you can add more events later, like:
  // socket.on("typing", () => { ... })
  // socket.on("join-room", (roomId) => { ... })
}

module.exports = {
  registerChatHandlers,
};
