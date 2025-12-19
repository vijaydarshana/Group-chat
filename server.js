// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config({ path: __dirname + "/.env" });
require("../group-chat/jobs/cron"); 
const { initDB } = require("../group-chat/config/db");
const aiChatRoutes = require("./routes/aiChatRoutes");
const authRoutes = require("./routes/authRoutes"); // your existing auth routes (signup/login)
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");

const { initSocketServer } = require("../group-chat/socket-io-frontend/client");

const app = express();

// Init DB (creates tables)
initDB();

app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/auth", authRoutes);      // ensure authRoutes exists: signup/login
app.use("/api/auth", userRoutes);      // user lookup
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/ai", aiChatRoutes);
app.get("/", (req, res) => res.send("Chat API running"));

// Create HTTP server and init socket server
const server = http.createServer(app);
initSocketServer(server, app);

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
