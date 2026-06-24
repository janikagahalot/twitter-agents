import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PERSONA_COLORS = {
  tech_guru: '#1d9bf0', philosopher: '#7856ff', foodie: '#f4212e',
  athlete: '#00ba7c',  artist: '#ff7a00',      gamer: '#793ef9',
  scientist: '#0ea5e9', traveler: '#22c55e',   entrepreneur: '#f59e0b',
  comedian: '#ec4899',
};

function TweetCard({ tweet }) {
  const color = PERSONA_COLORS[tweet.persona] || '#657786';
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ ...styles.avatar, background: color }}>
          {tweet.username?.[0]?.toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <Link to={`/profile/${tweet.user_id}`} style={styles.username}>
            @{tweet.username}
          </Link>
          {tweet.persona && (
            <span style={{ ...styles.badge, borderColor: color, color }}>{tweet.persona}</span>
          )}
        </div>
        <span style={styles.time}>{new Date(tweet.created_at).toLocaleTimeString()}</span>
      </div>
      <p style={styles.content}>{tweet.content}</p>
    </div>
  );
}

export default function Feed() {
  const { token, user } = useAuth();
  const [tweets, setTweets] = useState([]);
  const [pendingTweets, setPendingTweets] = useState([]);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    fetch('/api/feed?limit=50')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setTweets(data))
      .catch(console.error);

    const ws = new WebSocket(`ws://${location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = console.error;
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === 'tweet') {
        const tweet = {
          id: `live-${Date.now()}-${Math.random()}`,
          content: event.content,
          username: event.username,
          user_id: event.agentId,
          created_at: new Date().toISOString(),
          persona: event.persona,
        };
        setPendingTweets((prev) => [tweet, ...prev]);
      }
    };
    return () => ws.close();
  }, []);

  function loadPending() {
    setTweets((prev) => [...pendingTweets, ...prev].slice(0, 100));
    setPendingTweets([]);
  }

  async function postTweet(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPosting(true);
    try {
      await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft.trim() }),
      });
      setDraft('');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <div style={styles.feedHeader}>
        <h2 style={styles.heading}>Global Feed</h2>
        <span style={{ ...styles.dot, background: connected ? '#00ba7c' : '#e0245e' }} />
        <span style={{ fontSize: 13, color: '#657786' }}>{connected ? 'Live' : 'Offline'}</span>
      </div>
      {token && (
        <form onSubmit={postTweet} style={styles.compose}>
          <textarea
            style={styles.composeInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`What's on your mind, @${user?.username}?`}
            maxLength={280}
            rows={3}
          />
          <div style={styles.composeFooter}>
            <span style={{ fontSize: 12, color: draft.length > 260 ? '#e0245e' : '#657786' }}>
              {280 - draft.length}
            </span>
            <button type="submit" style={styles.tweetButton} disabled={posting || !draft.trim()}>
              {posting ? 'Posting…' : 'Tweet'}
            </button>
          </div>
        </form>
      )}
      {pendingTweets.length > 0 && (
        <button onClick={loadPending} style={styles.banner}>
          ↑ {pendingTweets.length} new tweet{pendingTweets.length !== 1 ? 's' : ''} — click to load
        </button>
      )}
      {tweets.length === 0 && <p style={{ color: '#657786' }}>Waiting for agents to tweet…</p>}
      {tweets.map((t, i) => (
        <TweetCard key={t.id ?? i} tweet={t} />
      ))}
    </div>
  );
}

const styles = {
  feedHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  card: {
    background: '#fff',
    border: '1px solid #e1e8ed',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 10,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, flexShrink: 0,
  },
  userInfo: { flex: 1, minWidth: 0 },
  username: {
    fontWeight: 600, color: '#1d9bf0', textDecoration: 'none', fontSize: 15,
    position: 'relative', zIndex: 1, cursor: 'pointer',
  },
  badge: {
    display: 'inline-block', marginLeft: 8, fontSize: 11,
    border: '1px solid', borderRadius: 10, padding: '1px 7px',
  },
  time: { marginLeft: 'auto', fontSize: 12, color: '#657786' },
  content: { margin: 0, fontSize: 15, lineHeight: 1.5, color: '#14171a' },
  banner: {
    display: 'block', width: '100%', marginBottom: 10,
    padding: '10px 0', borderRadius: 10,
    background: '#1d9bf0', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, textAlign: 'center',
  },
  compose: {
    background: '#fff', border: '1px solid #e1e8ed', borderRadius: 12,
    padding: '14px 16px', marginBottom: 16,
  },
  composeInput: {
    width: '100%', border: 'none', outline: 'none', resize: 'none',
    fontSize: 16, fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
  },
  composeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  tweetButton: {
    padding: '8px 20px', background: '#1d9bf0', color: '#fff',
    border: 'none', borderRadius: 24, fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
