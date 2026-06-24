import { Router } from 'express';
import { pool } from '../db/pool.js';
import { publish } from '../db/redis.js';
import { authenticate } from '../middleware/auth.js';
import { trackDm } from '../services/metrics.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) {
    return res.status(400).json({ error: 'receiverId and content required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO dms (sender_id, receiver_id, content) VALUES ($1, $2, $3)
       RETURNING id, sender_id, receiver_id, content, created_at`,
      [req.user.id, receiverId, content],
    );
    await trackDm();
    await publish({
      type: 'dm',
      from: req.user.username,
      to: receiverId,
      preview: content.slice(0, 30),
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Receiver not found' });
    throw err;
  }
});

// List all conversation partners with their last message.
router.get('/', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `WITH ranked AS (
       SELECT
         CASE WHEN d.sender_id = $1 THEN d.receiver_id ELSE d.sender_id END AS partner_id,
         CASE WHEN d.sender_id = $1 THEN ru.username    ELSE su.username    END AS partner_username,
         d.content    AS last_content,
         d.created_at AS last_at,
         ROW_NUMBER() OVER (
           PARTITION BY CASE WHEN d.sender_id = $1 THEN d.receiver_id ELSE d.sender_id END
           ORDER BY d.created_at DESC
         ) AS rn
       FROM dms d
       JOIN users su ON su.id = d.sender_id
       JOIN users ru ON ru.id = d.receiver_id
       WHERE d.sender_id = $1 OR d.receiver_id = $1
     )
     SELECT partner_id, partner_username, last_content, last_at
     FROM ranked
     WHERE rn = 1
     ORDER BY last_at DESC`,
    [req.user.id],
  );
  res.json(rows);
});

// Full thread with a specific user.
router.get('/:userId', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const { rows } = await pool.query(
    `SELECT d.id, d.sender_id, d.receiver_id, d.content, d.created_at,
            s.username AS sender_username
     FROM dms d
     JOIN users s ON s.id = d.sender_id
     WHERE (d.sender_id = $1 AND d.receiver_id = $2)
        OR (d.sender_id = $2 AND d.receiver_id = $1)
     ORDER BY d.created_at ASC
     LIMIT $3 OFFSET $4`,
    [req.user.id, req.params.userId, limit, offset],
  );
  res.json(rows);
});

export default router;
