import 'dotenv/config';
import { runAgent } from './agent.js';

const COUNT = parseInt(process.env.AGENT_COUNT || '100', 10);

console.log(`Spawning ${COUNT} agents against ${process.env.API_URL || 'http://localhost:3000'}`);

// Stagger agent boot by 100 ms each to avoid a thundering herd on /auth/register.
for (let i = 0; i < COUNT; i++) {
  setTimeout(() => runAgent(i), i * 100);
}
