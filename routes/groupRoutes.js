// routes/groupRoutes.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/auth");

// Create group
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name required" });

    const [result] = await pool.query(
      "INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)",
      [name, description || null, req.user.id]
    );

    const groupId = result.insertId;
    await pool.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", [groupId, req.user.id]);

    const [rows] = await pool.query("SELECT * FROM groups WHERE id = ? LIMIT 1", [groupId]);
    return res.status(201).json({ success: true, group: rows[0] });
  } catch (err) {
    console.error("POST /api/groups error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Join group
router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: "Invalid group id" });

    await pool.query("INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)", [groupId, req.user.id]);
    return res.json({ success: true, message: "Joined group" });
  } catch (err) {
    console.error("POST /api/groups/:id/join error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Leave group
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    await pool.query("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", [groupId, req.user.id]);
    return res.json({ success: true, message: "Left group" });
  } catch (err) {
    console.error("POST /api/groups/:id/leave error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// My groups
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.* FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, groups: rows });
  } catch (err) {
    console.error("GET /api/groups/mine error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Group messages
router.get("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const [rows] = await pool.query(
      `SELECT gm.id, gm.group_id, gm.sender_id, gm.message, gm.created_at, u.name as sender_name
       FROM group_messages gm
       LEFT JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id = ?
       ORDER BY gm.created_at ASC
       LIMIT ?`,
      [groupId, limit]
    );

    return res.json({ success: true, messages: rows });
  } catch (err) {
    console.error("GET /api/groups/:id/messages error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
