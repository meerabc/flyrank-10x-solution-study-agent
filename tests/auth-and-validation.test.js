const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('register rejects invalid email', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'password123' });

  assert.strictEqual(response.status, 400);
});

test('register rejects short password', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'shortpass@example.com', password: 'short' });

  assert.strictEqual(response.status, 400);
});

test('materials endpoint rejects requests with no auth token', async () => {
  const response = await request(app)
    .post('/api/materials')
    .send({ fileName: 'test.pdf', fileData: 'aGVsbG8=' });

  assert.strictEqual(response.status, 401);
});

test('materials endpoint rejects an invalid token', async () => {
  const response = await request(app)
    .post('/api/materials')
    .set('Authorization', 'Bearer not-a-real-token')
    .send({ fileName: 'test.pdf', fileData: 'aGVsbG8=' });

  assert.strictEqual(response.status, 401);
});

test('materials upload rejects unsupported file type', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: `filetype-test-${Date.now()}@example.com`, password: 'password123' });

  const token = registerRes.body.token;

  const response = await request(app)
    .post('/api/materials')
    .set('Authorization', `Bearer ${token}`)
    .send({ fileName: 'notes.txt', fileData: 'aGVsbG8=' });

  assert.strictEqual(response.status, 400);
});

test('materials upload rejects missing fileData', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: `missing-data-test-${Date.now()}@example.com`, password: 'password123' });

  const token = registerRes.body.token;

  const response = await request(app)
    .post('/api/materials')
    .set('Authorization', `Bearer ${token}`)
    .send({ fileName: 'notes.pdf' });

  assert.strictEqual(response.status, 400);
});