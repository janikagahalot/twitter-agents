import { Router } from 'express';
import { pool } from '../db/pool.js';
import { getMetrics } from '../services/metrics.js';

const router = Router();

router.get('/metrics', async (req, res) => {
  const [metrics, countResult] = await Promise.all([
    getMetrics(),
    pool.query('SELECT COUNT(*) FROM users WHERE is_agent = TRUE'),
  ]);
  res.json({ ...metrics, totalAgents: parseInt(countResult.rows[0].count, 10) });
});

export default router;
