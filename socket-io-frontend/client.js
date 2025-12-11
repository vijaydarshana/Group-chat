// socket-io/index.js
const { Server } = require("socket.io");
const { socketAuthMiddleware } = require("./middleware");
const { registerChatHandlers } = require("./handlers/chat");
const { registerPersonalChatHandlers } = require("./handlers/personalChat");

function initSocketServer(server, app) {
  const io = new Server(server, {
    cors: {
      origin: "http://127.0.0.1:5500",
      methods: ["GET", "POST"],
    },
  });

  // authenticate sockets
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(
      "🟢 New client connected:",
      socket.id,
      "userId:",
      socket.user?.id
    );

    // register handler modules for this socket
    try {
      registerChatHandlers(io, socket);
    } catch (err) {
      console.error("registerChatHandlers error:", err && err.message);
    }

    try {
      registerPersonalChatHandlers(io, socket);
    } catch (err) {
      console.error("registerPersonalChatHandlers error:", err && err.message);
    }

    socket.on("disconnect", () => {
      console.log(
        "🔴 Client disconnected:",
        socket.id,
        "userId:",
        socket.user?.id
      );
    });
  });

  // expose io to express routes
  app.set("io", io);
  return io;
}

// Important: export as CommonJS object with initSocketServer
module.exports = {
  initSocketServer,
};
