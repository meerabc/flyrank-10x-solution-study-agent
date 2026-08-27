require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const materialRoutes = require('./routes/material.routes');
const quizRoutes = require('./routes/quiz.routes');

const app = express();

app.use(express.json({ limit: '20mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/materials', quizRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;