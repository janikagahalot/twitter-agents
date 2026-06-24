import { Router } from 'express';
import { pool } from '../db/pool.js';
import { publish, redis } from '../db/redis.js';
import { authenticate } from '../middleware/auth.js';
import { trackTweet } from '../services/metrics.js';

const router = Router();
const FEED_KEY = 'global:feed';
const FEED_TTL = 10;

router.post('/', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.length > 280) {
    return res.status(400).json({ error: 'content must be a non-empty string ≤ 280 chars' });
  }
  const { rows } = await pool.query(
    `INSERT INTO tweets (user_id, content) VALUES ($1, $2)
     RETURNING id, user_id, content, created_at`,
    [req.user.id, content],
  );
  const tweet = rows[0];
  // Invalidate cached global feed
  await redis.del(FEED_KEY);
  await trackTweet();
  await publish({ type: 'tweet', agentId: req.user.id, username: req.user.username, content });
  res.status(201).json(tweet);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.id, t.content, t.created_at, u.id AS user_id, u.username, u.persona
     FROM tweets t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Tweet not found' });
  res.json(rows[0]);
});

export default router;
