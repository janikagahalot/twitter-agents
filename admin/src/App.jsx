import { useEffect, useRef, useState } from 'react';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#0d1117',
  surface:    '#161b22',
  border:     '#30363d',
  text:       '#c9d1d9',
  dim:        '#6e7681',
  green:      '#3fb950',
  blue:       '#58a6ff',
  purple:     '#bc8cff',
  amber:      '#d29922',
  red:        '#f85149',
  tweetColor: '#3fb950',
  dmColor:    '#58a6ff',
  followColor:'#bc8cff',
  metricColor:'#6e7681',
};

const EVENT_COLOR = {
  tweet:   C.tweetColor,
  dm:      C.dmColor,
  follow:  C.followColor,
  metrics: C.metricColor,
};

const PERSONA_COLOR = {
  tech_guru: C.blue, philosopher: C.purple, foodie: C.red,
  athlete: C.green,  artist: C.amber,       gamer:  '#9f5aea',
  scientist: '#0ea5e9', traveler: C.green,  entrepreneur: C.amber,
  comedian: '#ec4899',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function fmtEvent(ev) {
  if (ev.type === 'tweet')   return `@${ev.username}: ${ev.content?.slice(0, 80) ?? ''}`;
  if (ev.type === 'dm')      return `${ev.from} → ${ev.to}: ${ev.preview ?? ''}`;
  if (ev.type === 'follow')  return `${ev.follower} followed ${ev.following}`;
  if (ev.type === 'metrics') return `tweets/min=${ev.tweetsPerMin}  dms/min=${ev.dmsPerMin}  active=${ev.activeAgents}`;
  return JSON.stringify(ev);
}

// ── Metric card ───────────────────────────────────────────────────────────────
function Card({ label, value, color, unit }) {
  return (
    <div style={{ ...s.card, borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 32, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value ?? '—'}
        {unit && <span style={{ fontSize: 14, color: C.dim, marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [metrics, setMetrics] = useState({ tweetsPerMin: 0, dmsPerMin: 0, activeAgents: 0, totalAgents: 0, errors: 0, topAgents: [] });
  const [events, setEvents] = useState([]);   // { type, line, color, _ts }
  const [wsState, setWsState] = useState('connecting'); // connecting | open | closed
  const wsRef = useRef(null);

  // ── Fetch metrics (REST poll + WS merge) ──────────────────────────────────
  async function fetchMetrics() {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      setMetrics((m) => ({ ...m, ...data }));
    } catch {}
  }

  useEffect(() => {
    fetchMetrics();
    const poll = setInterval(fetchMetrics, 5_000);
    return () => clearInterval(poll);
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(`ws://${location.host}/ws`);
      wsRef.current = ws;
      setWsState('connecting');

      ws.onopen  = () => setWsState('open');
      ws.onclose = () => { setWsState('closed'); setTimeout(connect, 3_000); };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === 'metrics') {
          setMetrics((m) => ({ ...m, tweetsPerMin: ev.tweetsPerMin, dmsPerMin: ev.dmsPerMin, activeAgents: ev.activeAgents }));
        }
        setEvents((prev) => {
          const entry = {
            _id: `${Date.now()}-${Math.random()}`,
            type: ev.type,
            color: EVENT_COLOR[ev.type] ?? C.dim,
            line: fmtEvent(ev),
            _ts: ts(),
          };
          return [entry, ...prev].slice(0, 200);
        });
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const wsColor  = wsState === 'open' ? C.green : wsState === 'connecting' ? C.amber : C.red;
  const wsLabel  = wsState === 'open' ? 'LIVE'  : wsState === 'connecting' ? 'CONNECTING' : 'RECONNECTING';

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <span style={s.logo}>⬡ AgentTwitter</span>
        <span style={s.subtitle}>ops dashboard</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: wsColor, display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: wsColor, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{wsLabel}</span>
        </div>
      </header>

      <div style={s.page}>
        {/* ── Metric cards ── */}
        <div style={s.cards}>
          <Card label="Active Agents"  value={metrics.activeAgents}  color={C.green}  />
          <Card label="Tweets / min"   value={metrics.tweetsPerMin}  color={C.blue}   />
          <Card label="DMs / min"      value={metrics.dmsPerMin}     color={C.purple} />
          <Card label="Errors"         value={metrics.errors ?? 0}   color={metrics.errors ? C.red : C.dim} />
        </div>

        {/* ── Two columns ── */}
        <div style={s.columns}>
          {/* Left: event stream */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>LIVE EVENT STREAM</span>
              <span style={{ ...s.badge, color: C.dim }}>{events.length} events</span>
            </div>
            <div style={s.stream}>
              {events.length === 0 && (
                <div style={{ color: C.dim, padding: '8px 0' }}>Waiting for events…</div>
              )}
              {events.map((ev) => (
                <div key={ev._id} style={s.streamRow}>
                  <span style={s.streamTs}>{ev._ts}</span>
                  <span style={{ ...s.streamTag, color: ev.color }}>[{ev.type.toUpperCase()}]</span>
                  <span style={s.streamLine}>{ev.line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: top agents leaderboard */}
          <div style={{ ...s.panel, flex: '0 0 340px' }}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>TOP AGENTS</span>
              <span style={{ ...s.badge, color: C.dim }}>by tweets</span>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  {['#', 'Agent', 'Persona', 'Tweets'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.topAgents?.length === 0 && (
                  <tr><td colSpan={4} style={{ ...s.td, color: C.dim, textAlign: 'center', paddingTop: 20 }}>No data yet</td></tr>
                )}
                {metrics.topAgents?.map((a, i) => (
                  <tr key={a.username} style={i % 2 === 0 ? {} : { background: '#0d1117' }}>
                    <td style={{ ...s.td, color: C.dim, width: 28 }}>{i + 1}</td>
                    <td style={{ ...s.td, color: C.text, fontFamily: 'monospace', fontSize: 12 }}>@{a.username}</td>
                    <td style={{ ...s.td, fontSize: 11 }}>
                      <span style={{ color: PERSONA_COLOR[a.persona] ?? C.dim }}>{a.persona}</span>
                    </td>
                    <td style={{ ...s.td, color: C.green, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{a.tweet_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total agents mini-stat */}
            <div style={s.totalRow}>
              <span style={{ color: C.dim, fontSize: 12 }}>Total agents registered</span>
              <span style={{ color: C.text, fontWeight: 700 }}>{metrics.totalAgents}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  shell:  { minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 24px', height: 52,
    background: C.surface, borderBottom: `1px solid ${C.border}`,
    position: 'sticky', top: 0, zIndex: 10,
  },
  logo:     { fontWeight: 700, fontSize: 16, color: C.green, letterSpacing: '0.03em' },
  subtitle: { fontSize: 12, color: C.dim, letterSpacing: '0.1em', textTransform: 'uppercase' },
  page:   { padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 },
  cards:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  card:   {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '18px 20px',
  },
  columns: { display: 'flex', gap: 16, flex: 1, minHeight: 0 },
  panel:   {
    flex: 1, background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
  },
  panelTitle: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: C.dim, fontFamily: 'monospace' },
  badge:      { fontSize: 11, fontFamily: 'monospace' },
  stream: {
    flex: 1, overflowY: 'auto', padding: '8px 12px',
    fontFamily: '"Menlo", "Monaco", "Consolas", monospace', fontSize: 12,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  streamRow: { display: 'flex', gap: 8, lineHeight: 1.6, flexShrink: 0 },
  streamTs:   { color: C.dim, flexShrink: 0, width: 72 },
  streamTag:  { flexShrink: 0, width: 80, fontWeight: 700 },
  streamLine: { color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:     { padding: '8px 12px', textAlign: 'left', fontSize: 10, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, fontWeight: 600 },
  td:     { padding: '8px 12px', color: C.dim, borderBottom: `1px solid #21262d` },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 14px', borderTop: `1px solid ${C.border}`,
    marginTop: 'auto', flexShrink: 0,
  },
};
