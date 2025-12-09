const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: __dirname + "/.env" });
const { initDB } = require("./config/db");

const app = express();
initDB();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Chat API running");
});

// ✅ Create HTTP server + Socket.IO
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

// allow frontend origin (127.0.0.1:5500)
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500", // adjust if Live Server uses a different host/port
    methods: ["GET", "POST"],
  },
});

// 🔌 When a client connects
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Make io available elsewhere if needed
app.set("io", io);

server.listen(process.env.PORT, () =>
  console.log(`✅ Server running on port ${process.env.PORT}`)
);
