import { createClient } from 'redis';
import 'dotenv/config';

export const redis = createClient({ url: process.env.REDIS_URL });
export const redisSub = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.error('Redis client error', err));
redisSub.on('error', (err) => console.error('Redis sub error', err));

export async function connectRedis() {
  await redis.connect();
  await redisSub.connect();
}

export const EVENTS_CHANNEL = 'ws:events';

export async function publish(event) {
  await redis.publish(EVENTS_CHANNEL, JSON.stringify(event));
}
