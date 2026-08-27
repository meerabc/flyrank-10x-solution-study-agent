const { registerSchema, loginSchema } = require('../middleware/auth.schema');
const { hashPassword, comparePassword, generateToken } = require('../services/auth.service');
const { createUser, findUserByEmail } = require('../models/user.model');

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { email, password } = parsed.data;

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const userId = createUser(email, passwordHash);
  const token = generateToken(userId);

  res.status(201).json({ token, user: { id: userId, email } });
}

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { email, password } = parsed.data;

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
}

module.exports = { register, login };