const db = require('../config/db');

function createUser(email, passwordHash) {
  const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
  const result = stmt.run(email, passwordHash);
  return result.lastInsertRowid;
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

module.exports = { createUser, findUserByEmail };