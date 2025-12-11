// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

/**
 * GET /api/auth/user?email=someone@example.com
 * Returns a user by email
 */
router.get("/user", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, phone FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: rows[0],
    });
  } catch (err) {
    console.error("Error in GET /api/auth/user:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
