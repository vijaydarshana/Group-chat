const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  try {
    console.log("🔄 Initializing MySQL tables...");

    // USERS TABLE (already exists in your project)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ACTIVE CHAT TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

    `);

    // ARCHIVED CHAT TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archived_messages (
        id INT PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(20),
        created_at DATETIME,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (room_id),
        INDEX (created_at)
      )
    `);

    console.log("✅ MySQL connected & all tables ready");
  } catch (err) {
    console.error("❌ MySQL Init Error:", err.message);
  }
}

module.exports = {
  pool,
  initDB,
};
