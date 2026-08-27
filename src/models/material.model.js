const db = require('../config/db');

function findByHash(userId, fileHash) {
  return db.prepare('SELECT * FROM materials WHERE user_id = ? AND file_hash = ?').get(userId, fileHash);
}

function createMaterial({ userId, fileName, fileHash, fileType }) {
  const stmt = db.prepare(`
    INSERT INTO materials (user_id, file_name, file_hash, file_type, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(userId, fileName, fileHash, fileType);
  return result.lastInsertRowid;
}

function getMaterialById(id, userId) {
  return db.prepare('SELECT * FROM materials WHERE id = ? AND user_id = ?').get(id, userId);
}

function updateStatus(id, status) {
  db.prepare('UPDATE materials SET status = ? WHERE id = ?').run(status, id);
}

module.exports = { findByHash, createMaterial, getMaterialById, updateStatus };