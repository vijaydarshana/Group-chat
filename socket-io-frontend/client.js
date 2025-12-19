// socket-io/index.js
const { Server } = require("socket.io");
const { socketAuthMiddleware } = require("./middleware");
const { registerChatHandlers } = require("./handlers/chat");
const { registerPersonalChatHandlers } = require("./handlers/personalChat");
const { registerGroupChatHandlers } = require("./handlers/groupChat");

function initSocketServer(server, app) {
  const io = new Server(server, {
    cors: {
      origin: "http://127.0.0.1:5500",
      methods: ["GET", "POST"],
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log("🟢 New client connected:", socket.id, "userId:", socket.user?.id);

    registerChatHandlers(io, socket);
    registerPersonalChatHandlers(io, socket);
    registerGroupChatHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id, "userId:", socket.user?.id);
    });
  });

  app.set("io", io);
  return io;
}

module.exports = { initSocketServer };
