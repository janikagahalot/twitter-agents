import { Router } from 'express';
import { pool } from '../db/pool.js';
import { publish } from '../db/redis.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/follows', authenticate, async (req, res) => {
  const { targetId } = req.body;
  if (!targetId) return res.status(400).json({ error: 'targetId required' });
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    await pool.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, targetId],
    );
    await publish({ type: 'follow', follower: req.user.username, following: targetId });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Target user not found' });
    throw err;
  }
});

router.delete('/follows/:targetId', authenticate, async (req, res) => {
  await pool.query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [req.user.id, req.params.targetId],
  );
  res.json({ ok: true });
});

export default router;
