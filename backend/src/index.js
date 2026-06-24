import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { connectRedis, redisSub, EVENTS_CHANNEL, publish } from './db/redis.js';
import { getMetrics } from './services/metrics.js';

import authRoutes     from './routes/auth.js';
import tweetRoutes    from './routes/tweets.js';
import timelineRoutes from './routes/timeline.js';
import followRoutes   from './routes/follows.js';
import userRoutes     from './routes/users.js';
import dmRoutes       from './routes/dms.js';
import adminRoutes    from './routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth',   authRoutes);
app.use('/tweets', tweetRoutes);
app.use('/',       timelineRoutes); // GET /timeline, GET /feed
app.use('/',       followRoutes);   // POST /follows, DELETE /follows/:id
app.use('/users',  userRoutes);     // GET /users, /users/:id, /users/:id/tweets|followers|following
app.use('/dms',    dmRoutes);       // POST /dms, GET /dms, GET /dms/:userId
app.use('/admin',  adminRoutes);    // GET /admin/metrics

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── WebSocket ──────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log(`WS client connected (total: ${wss.clients.size})`);
  ws.on('close', () => console.log(`WS client disconnected (total: ${wss.clients.size})`));
  ws.on('error', console.error);
});

function broadcast(data) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  }
}

// Broadcast metrics to all WS clients every 5 seconds
async function broadcastMetrics() {
  try {
    const metrics = await getMetrics();
    await publish({ type: 'metrics', ...metrics });
  } catch {}
}

// ── Startup ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

async function start() {
  await connectRedis();
  // Forward every Redis pub/sub event to all WS clients
  await redisSub.subscribe(EVENTS_CHANNEL, (message) => broadcast(message));

  setInterval(broadcastMetrics, 5_000);

  server.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
