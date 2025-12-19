const { pool } = require("../config/db");

async function archiveOldMessages() {
  console.log("🕐 Archiving old messages...");

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Move messages older than 1 day
    const insertQuery = `
      INSERT INTO archived_messages (id, room_id, user_id, message, message_type, created_at)
      SELECT id, room_id, user_id, message, message_type, created_at
      FROM messages
      WHERE created_at < NOW() - INTERVAL 1 DAY
    `;
    await connection.query(insertQuery);

    // 2️⃣ Delete them from main table
    const deleteQuery = `
      DELETE FROM messages
      WHERE created_at < NOW() - INTERVAL 1 DAY
    `;
    await connection.query(deleteQuery);

    await connection.commit();
    console.log("✅ Archiving completed successfully");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Archiving failed:", err.message);
  } finally {
    connection.release();
  }
}

module.exports = { archiveOldMessages };
