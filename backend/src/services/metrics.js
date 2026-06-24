import { redis } from '../db/redis.js';

const TWEET_KEY = 'metrics:tweets';
const DM_KEY = 'metrics:dms';
const WINDOW_MS = 60_000;

export async function trackTweet() {
  const now = Date.now();
  await redis.zAdd(TWEET_KEY, [{ score: now, value: `${now}-${Math.random()}` }]);
  await redis.expire(TWEET_KEY, 120);
}

export async function trackDm() {
  const now = Date.now();
  await redis.zAdd(DM_KEY, [{ score: now, value: `${now}-${Math.random()}` }]);
  await redis.expire(DM_KEY, 120);
}

export async function getMetrics() {
  const since = Date.now() - WINDOW_MS;

  const [tweetsPerMin, dmsPerMin] = await Promise.all([
    redis.zCount(TWEET_KEY, since, '+inf'),
    redis.zCount(DM_KEY, since, '+inf'),
  ]);

  const keys = await redis.keys('agent:heartbeat:*');
  let activeAgents = 0;
  if (keys.length > 0) {
    const values = await redis.mGet(keys);
    const cutoff = Date.now() - 30_000;
    activeAgents = values.filter((v) => v !== null && parseInt(v) > cutoff).length;
  }

  return { tweetsPerMin, dmsPerMin, activeAgents };
}
