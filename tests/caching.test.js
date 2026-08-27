const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const materialModel = require('../src/models/material.model');
const db = require('../src/config/db');

test('a material with status done is found by its file hash', () => {
  const testHash = crypto.createHash('sha256').update('test content for caching').digest('hex');

  const userResult = db.prepare(`
    INSERT INTO users (email, password_hash) VALUES (?, ?)
  `).run(`cache-test-${Date.now()}@example.com`, 'fake-hash-not-real');
  const userId = userResult.lastInsertRowid;

  const materialId = materialModel.createMaterial({
    userId,
    fileName: 'cached-file.pdf',
    fileHash: testHash,
    fileType: 'pdf',
  });
  materialModel.updateStatus(materialId, 'done');

  const found = materialModel.findByHash(userId, testHash);

  assert.ok(found, 'expected to find the cached material');
  assert.strictEqual(found.status, 'done');
  assert.strictEqual(found.id, materialId);
});

test('a material with status failed is still findable but should not be treated as a valid cache hit', () => {
  const testHash = crypto.createHash('sha256').update('failed content test').digest('hex');

  const userResult = db.prepare(`
    INSERT INTO users (email, password_hash) VALUES (?, ?)
  `).run(`cache-fail-test-${Date.now()}@example.com`, 'fake-hash-not-real');
  const userId = userResult.lastInsertRowid;

  const materialId = materialModel.createMaterial({
    userId,
    fileName: 'failed-file.pdf',
    fileHash: testHash,
    fileType: 'pdf',
  });
  materialModel.updateStatus(materialId, 'failed');

  const found = materialModel.findByHash(userId, testHash);

  assert.ok(found);
  assert.strictEqual(found.status, 'failed');
});

test('a different user cannot find another user material by the same hash logic scoped correctly', () => {
  const sharedHash = crypto.createHash('sha256').update('shared file content').digest('hex');

  const user1 = db.prepare(`INSERT INTO users (email, password_hash) VALUES (?, ?)`).run(`u1-${Date.now()}@example.com`, 'x');
  const user2 = db.prepare(`INSERT INTO users (email, password_hash) VALUES (?, ?)`).run(`u2-${Date.now()}@example.com`, 'x');

  materialModel.createMaterial({
    userId: user1.lastInsertRowid,
    fileName: 'shared.pdf',
    fileHash: sharedHash,
    fileType: 'pdf',
  });

  const foundForUser2 = materialModel.findByHash(user2.lastInsertRowid, sharedHash);

  assert.strictEqual(foundForUser2, undefined, 'user 2 should not see user 1s cached material');
});