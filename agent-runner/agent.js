import { personas, personaNames } from './personas.js';

const API = process.env.API_URL || 'http://localhost:3000';

function jitter(minSec, maxSec) {
  return (Math.random() * (maxSec - minSec) + minSec) * 1000;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

export async function runAgent(index) {
  const personaName = personaNames[index % personaNames.length];
  const persona = personas[personaName];
  const username = `${personaName}_${index}`;
  // Deterministic password so restarts can re-login instead of failing on re-register.
  const password = `tw_agent_${index}_v1_secret`;

  let token, myId;

  // Register; fall back to login if username is already taken.
  const reg = await call('POST', '/auth/register', {
    username,
    password,
    bio: persona.bio,
    persona: personaName,
    is_agent: true,
  });

  if (reg.token) {
    token = reg.token;
    myId = reg.user.id;
    console.log(`[${username}] registered`);
  } else {
    const login = await call('POST', '/auth/login', { username, password });
    if (!login.token) {
      console.error(`[${username}] cannot register or login — aborting`);
      return;
    }
    token = login.token;
    myId = login.user.id;
    console.log(`[${username}] logged in`);
  }

  // ── Tweet loop ──────────────────────────────────────────────────────────────
  const tweetLoop = async () => {
    try {
      await call('POST', '/tweets', { content: pick(persona.tweets) }, token);
    } catch {}
    setTimeout(tweetLoop, jitter(5, 15));
  };

  // ── Follow loop ─────────────────────────────────────────────────────────────
  const followLoop = async () => {
    try {
      const users = await call('GET', '/users?limit=500');
      if (Array.isArray(users)) {
        const others = users.filter((u) => u.id !== myId);
        if (others.length > 0) {
          await call('POST', '/follows', { targetId: pick(others).id }, token);
        }
      }
    } catch {}
    setTimeout(followLoop, jitter(20, 40));
  };

  // ── DM loop ─────────────────────────────────────────────────────────────────
  const dmLoop = async () => {
    try {
      const following = await call('GET', `/users/${myId}/following`);
      if (Array.isArray(following) && following.length > 0) {
        const target = pick(following);
        const content = `Hey! ${pick(persona.tweets)}`;
        await call('POST', '/dms', { receiverId: target.id, content }, token);
      }
    } catch {}
    setTimeout(dmLoop, jitter(30, 60));
  };

  // ── Heartbeat loop ──────────────────────────────────────────────────────────
  const heartbeatLoop = async () => {
    try {
      await call('POST', '/auth/heartbeat', {}, token);
    } catch {}
    setTimeout(heartbeatLoop, 10_000);
  };

  // Stagger initial startup so 100 agents don't all fire at once.
  setTimeout(tweetLoop,     jitter(0, 3));
  setTimeout(followLoop,    jitter(3, 10));
  setTimeout(dmLoop,        jitter(10, 20));
  setTimeout(heartbeatLoop, jitter(0.5, 2));
}
