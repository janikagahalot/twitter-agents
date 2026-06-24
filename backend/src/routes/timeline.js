import { Router } from 'express';
import { pool } from '../db/pool.js';
import { redis } from '../db/redis.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const FEED_KEY = 'global:feed';
const FEED_TTL = 10;

router.get('/timeline', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const { rows } = await pool.query(
    `SELECT t.id, t.content, t.created_at, u.id AS user_id, u.username, u.persona
     FROM tweets t
     JOIN users u ON u.id = t.user_id
     WHERE t.user_id IN (
       SELECT following_id FROM follows WHERE follower_id = $1
     )
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset],
  );
  res.json(rows);
});

router.get('/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  if (offset === 0) {
    const cached = await redis.get(FEED_KEY);
    if (cached) return res.json(JSON.parse(cached));
  }

  const { rows } = await pool.query(
    `SELECT t.id, t.content, t.created_at, u.id AS user_id, u.username, u.persona
     FROM tweets t
     JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  if (offset === 0) {
    await redis.setEx(FEED_KEY, FEED_TTL, JSON.stringify(rows));
  }

  res.json(rows);
});

export default router;
