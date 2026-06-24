import { useEffect, useRef, useState } from 'react';

const EVENT_COLORS = {
  tweet: '#1d9bf0',
  dm: '#00ba7c',
  follow: '#f4212e',
  metrics: '#657786',
};

function Stat({ label, value, color = '#1d9bf0' }) {
  return (
    <div style={{ ...styles.stat, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 36, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ color: '#657786', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function Admin() {
  const [metrics, setMetrics] = useState({
    tweetsPerMin: 0, dmsPerMin: 0, activeAgents: 0, totalAgents: 0,
  });
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const fetchMetrics = () =>
      fetch('/api/admin/metrics')
        .then((r) => r.json())
        .then((d) => d && !d.error && setMetrics(d))
        .catch(console.error);

    fetchMetrics();
    const poll = setInterval(fetchMetrics, 5_000);

    const ws = new WebSocket(`ws://${location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = console.error;
    ws.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.type === 'metrics') {
        setMetrics((m) => ({ ...m, ...ev }));
      }
      setEvents((prev) => [{ ...ev, _ts: Date.now() }, ...prev.slice(0, 99)]);
    };

    return () => {
      clearInterval(poll);
      ws.close();
    };
  }, []);

  function renderEventLine(ev) {
    if (ev.type === 'tweet') return `@${ev.username}: ${ev.content?.slice(0, 70)}`;
    if (ev.type === 'dm')    return `${ev.from} → ${ev.to}: ${ev.preview}`;
    if (ev.type === 'follow') return `${ev.follower} followed ${ev.following}`;
    if (ev.type === 'metrics')
      return `tweets/min=${ev.tweetsPerMin} dms/min=${ev.dmsPerMin} active=${ev.activeAgents}`;
    return JSON.stringify(ev);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h2>
        <span style={{ ...styles.dot, background: connected ? '#00ba7c' : '#e0245e' }} />
        <span style={{ fontSize: 13, color: '#657786' }}>{connected ? 'Live' : 'Offline'}</span>
      </div>

      <div style={styles.grid}>
        <Stat label="Tweets / min"   value={metrics.tweetsPerMin}  color="#1d9bf0" />
        <Stat label="DMs / min"      value={metrics.dmsPerMin}     color="#00ba7c" />
        <Stat label="Active agents"  value={metrics.activeAgents}  color="#f59e0b" />
        <Stat label="Total agents"   value={metrics.totalAgents}   color="#7856ff" />
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 700, margin: '24px 0 10px' }}>Live Event Stream</h3>
      <div style={styles.stream}>
        {events.length === 0 && (
          <div style={{ color: '#657786', padding: 12 }}>Waiting for events…</div>
        )}
        {events.map((ev, i) => (
          <div key={i} style={styles.eventRow}>
            <span style={{ color: '#8899a6', flexShrink: 0 }}>
              {new Date(ev._ts).toLocaleTimeString()}
            </span>
            <span style={{ color: EVENT_COLORS[ev.type] ?? '#657786', flexShrink: 0, fontWeight: 600 }}>
              [{ev.type}]
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {renderEventLine(ev)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 8,
  },
  stat: {
    background: '#fff', border: '1px solid #e1e8ed', borderRadius: 10,
    padding: '16px 20px', textAlign: 'center',
  },
  stream: {
    background: '#0f172a', borderRadius: 10, padding: 12,
    maxHeight: 420, overflowY: 'auto',
    fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0',
  },
  eventRow: {
    display: 'flex', gap: 8, padding: '3px 0',
    borderBottom: '1px solid #1e293b',
  },
};
