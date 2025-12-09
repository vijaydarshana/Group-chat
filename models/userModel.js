const { pool } = require("../config/db");

// find by email
async function findUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, password FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0];
}

// find by phone
async function findUserByPhone(phone) {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, password FROM users WHERE phone = ? LIMIT 1",
    [phone]
  );
  return rows[0];
}

// find by email OR phone
async function findUserByIdentifier(identifier) {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, password FROM users WHERE email = ? OR phone = ? LIMIT 1",
    [identifier, identifier]
  );
  return rows[0];
}

// create new user
async function createUser({ name, email, phone, password }) {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
    [name, email, phone, password]
  );

  return {
    id: result.insertId,
    name,
    email,
    phone,
  };
}

module.exports = {
  findUserByEmail,
  findUserByPhone,
  findUserByIdentifier,
  createUser,
};
