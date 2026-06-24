import { Router } from 'express';
import { pool } from '../db/pool.js';
import { getMetrics } from '../services/metrics.js';

const router = Router();

router.get('/metrics', async (req, res) => {
  const [metrics, countResult, topAgentsResult] = await Promise.all([
    getMetrics(),
    pool.query('SELECT COUNT(*) FROM users WHERE is_agent = TRUE'),
    pool.query(`
      SELECT u.username, u.persona, COUNT(t.id)::int AS tweet_count
      FROM users u
      LEFT JOIN tweets t ON t.user_id = u.id
      WHERE u.is_agent = TRUE
      GROUP BY u.id, u.username, u.persona
      ORDER BY tweet_count DESC
      LIMIT 10
    `),
  ]);
  res.json({
    ...metrics,
    totalAgents: parseInt(countResult.rows[0].count, 10),
    topAgents: topAgentsResult.rows,
    errors: 0,
  });
});

export default router;
