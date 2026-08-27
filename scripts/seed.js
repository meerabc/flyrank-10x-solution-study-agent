const db = require('../src/config/db');
const bcrypt = require('bcrypt');

async function seed() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');

  if (existing) {
    console.log('Demo user already exists: demo@example.com / demo1234');
    return;
  }

  db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('demo@example.com', passwordHash);
  console.log('Created demo user: demo@example.com / demo1234');
  console.log('\nNext steps:');
  console.log('1. POST /api/auth/login with these credentials to get a token');
  console.log('2. POST /api/materials with a base64 encoded pdf or pptx file to process it');
  console.log('3. GET /api/materials/:id to check processing status');
  console.log('4. GET /api/materials/:id/quiz to get quiz questions once status is done');
  console.log('5. POST /api/materials/:id/answers to log an answer');
}

seed();