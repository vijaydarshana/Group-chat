// routes/messageRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const { pool } = require("../config/db");

const router = express.Router();

/**
 * POST /api/messages
 * Save a chat message & broadcast via Socket.IO
 * Body: { message: "hello" }
 * Auth: Bearer token
 */
router.post("/", auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });
    }

    const trimmed = message.trim();

    // Save to MySQL
    const [result] = await pool.query(
      "INSERT INTO messages (user_id, message) VALUES (?, ?)",
      [req.user.id, trimmed]
    );

    const savedMessage = {
      id: result.insertId,
      user_id: req.user.id,
      message: trimmed,
      created_at: new Date(),
    };

    // ✅ Broadcast to all connected clients via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("new-message", savedMessage); // frontend listens on "new-message"
    }

    return res.status(201).json({
      success: true,
      message: "Message stored",
      data: savedMessage,
    });
  } catch (err) {
    console.error("Message create error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while storing message" });
  }
});

/**
 * GET /api/messages
 * Fetch all chat messages (history)
 * Auth: Bearer token
 */
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         id,
         user_id,
         message,
         created_at
       FROM messages
       ORDER BY created_at ASC`
    );

    return res.json({
      success: true,
      messages: rows,
    });
  } catch (err) {
    console.error("Get messages error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching messages" });
  }
});

module.exports = router;
