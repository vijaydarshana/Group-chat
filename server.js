// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config({ path: __dirname + "/.env" });
const { initDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes");

// correct relative path to socket-io folder
const { initSocketServer } = require("../group-chat/socket-io-frontend/client");

const app = express();

// Initialize DB
initDB();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/auth", userRoutes);  

app.get("/", (req, res) => res.send("Chat API running"));

const server = http.createServer(app);

// initialize socket-io (must be a function)
initSocketServer(server, app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
