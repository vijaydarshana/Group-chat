// models/messageModel.js
const { pool } = require("../config/db");

async function createMessage({ userId, message }) {
  const [result] = await pool.query(
    "INSERT INTO messages (user_id, message) VALUES (?, ?)",
    [userId, message]
  );

  return {
    id: result.insertId,
    user_id: userId,
    message,
  };
}

// optional: fetch all messages
async function getAllMessages() {
  const [rows] = await pool.query(
    `SELECT m.id, m.message, m.created_at, u.name AS user_name
     FROM messages m
     JOIN users u ON u.id = m.user_id
     ORDER BY m.created_at ASC`
  );
  return rows;
}

module.exports = {
  createMessage,
  getAllMessages,
};
