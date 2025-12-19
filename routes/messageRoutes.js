// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { pool } = require("../config/db");

/**
 * POST /api/messages
 * body: { message, roomId }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, roomId } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // ✅ REQUIRED FIX
    const finalRoomId = roomId || "global";

    const [result] = await pool.query(
      "INSERT INTO messages (room_id, user_id, message) VALUES (?, ?, ?)",
      [finalRoomId, req.user.id, message.trim()]
    );

    const saved = {
      id: result.insertId,
      room_id: finalRoomId,
      user_id: req.user.id,
      message: message.trim(),
      created_at: new Date(),
    };

    // 🔥 Emit to socket room
    const io = req.app.get("io");
    if (io) {
      io.to(finalRoomId).emit("new-message", saved);
    }

    return res.status(201).json({
      success: true,
      message: "Message stored",
      data: saved,
    });
  } catch (err) {
    console.error("POST /api/messages error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/**
 * GET /api/messages?roomId=global
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const roomId = req.query.roomId || "global";

    const [rows] = await pool.query(
      `SELECT id, room_id, user_id, message, created_at
       FROM messages
       WHERE room_id = ?
       ORDER BY created_at ASC`,
      [roomId]
    );

    return res.json({
      success: true,
      messages: rows,
    });
  } catch (err) {
    console.error("GET /api/messages error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
