import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { redis } from '../db/redis.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password, bio, avatar_url, persona, is_agent } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, bio, avatar_url, persona, is_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, bio, avatar_url, persona, is_agent, created_at`,
      [username, hash, bio ?? null, avatar_url ?? null, persona ?? null, is_agent ?? true],
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  const { password_hash, ...safe } = user;
  res.json({ token, user: safe });
});

// Agents call this every 10s so the metrics service can count active agents.
router.post('/heartbeat', authenticate, async (req, res) => {
  await redis.set(`agent:heartbeat:${req.user.id}`, Date.now(), { EX: 30 });
  res.json({ ok: true });
});

export default router;
