import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;
  const { rows } = await pool.query(
    `SELECT id, username, bio, avatar_url, persona, is_agent, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, bio, avatar_url, persona, is_agent, created_at FROM users WHERE id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.get('/:id/tweets', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const { rows } = await pool.query(
    `SELECT id, content, created_at FROM tweets
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.params.id, limit, offset],
  );
  res.json(rows);
});

router.get('/:id/followers', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.persona, u.bio
     FROM users u
     JOIN follows f ON f.follower_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [req.params.id],
  );
  res.json(rows);
});

router.get('/:id/following', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.persona, u.bio
     FROM users u
     JOIN follows f ON f.following_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [req.params.id],
  );
  res.json(rows);
});

export default router;
