import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dms() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(new Set()); // set of partner_username strings
  const threadBottomRef = useRef(null);
  const pollRef = useRef(null);
  const wsRef = useRef(null);

  // ── Load conversations ────────────────────────────────────────────────────
  async function fetchConversations() {
    const res = await fetch('/api/dms', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setConversations(data);
  }

  useEffect(() => {
    fetchConversations();

    const ws = new WebSocket(`ws://${location.host}/ws`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.type !== 'dm') return;
      // Refresh conversation list on any DM activity involving us
      fetchConversations();
      // Mark sender as unread only when they are not the currently open thread
      setSelectedId((cur) => {
        setConversations((convs) => {
          const sender = convs.find((c) => c.partner_username === ev.from);
          if (sender && sender.partner_id !== cur) {
            setUnread((prev) => new Set([...prev, ev.from]));
          }
          return convs;
        });
        return cur;
      });
    };
    return () => ws.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load + poll thread ────────────────────────────────────────────────────
  async function fetchThread(partnerId) {
    const res = await fetch(`/api/dms/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setThread(data);
  }

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!selectedId) return;
    fetchThread(selectedId);
    pollRef.current = setInterval(() => fetchThread(selectedId), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when thread updates
  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  function selectConversation(partnerId, partnerUsername) {
    setSelectedId(partnerId);
    setUnread((prev) => {
      const next = new Set(prev);
      next.delete(partnerUsername);
      return next;
    });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;
    await fetch('/api/dms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiverId: selectedId, content: draft.trim() }),
    });
    setDraft('');
    fetchThread(selectedId);
  }

  const selectedConv = conversations.find((c) => c.partner_id === selectedId);

  return (
    <div style={styles.layout}>
      {/* ── Left panel: conversation list ── */}
      <div style={styles.left}>
        <h3 style={styles.panelTitle}>Messages</h3>
        {conversations.length === 0 && (
          <p style={styles.empty}>No conversations yet.</p>
        )}
        {conversations.map((c) => {
          const active = c.partner_id === selectedId;
          const hasUnread = unread.has(c.partner_username);
          return (
            <button
              key={c.partner_id}
              onClick={() => selectConversation(c.partner_id, c.partner_username)}
              style={{ ...styles.convRow, ...(active ? styles.convRowActive : {}) }}
            >
              <div style={styles.convAvatar}>{c.partner_username[0].toUpperCase()}</div>
              <div style={styles.convMeta}>
                <div style={styles.convName}>
                  @{c.partner_username}
                  {hasUnread && <span style={styles.unreadDot} />}
                </div>
                <div style={styles.convPreview}>{c.last_content?.slice(0, 40)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right panel: thread ── */}
      <div style={styles.right}>
        {!selectedId ? (
          <div style={styles.empty}>Select a conversation to read messages.</div>
        ) : (
          <>
            <div style={styles.threadHeader}>@{selectedConv?.partner_username}</div>

            <div style={styles.thread}>
              {thread.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleTheirs) }}>
                    {!mine && <div style={styles.bubbleName}>@{m.sender_username}</div>}
                    <div style={mine ? styles.bubbleTextMine : styles.bubbleText}>{m.content}</div>
                    <div style={styles.bubbleTime}>{new Date(m.created_at).toLocaleTimeString()}</div>
                  </div>
                );
              })}
              <div ref={threadBottomRef} />
            </div>

            <form onSubmit={sendMessage} style={styles.inputRow}>
              <input
                style={styles.messageInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
              />
              <button type="submit" style={styles.sendButton} disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex', height: 'calc(100vh - 56px - 48px)',
    border: '1px solid #e1e8ed', borderRadius: 12, overflow: 'hidden', background: '#fff',
  },
  left: {
    width: 280, flexShrink: 0, borderRight: '1px solid #e1e8ed',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  },
  panelTitle: { margin: 0, padding: '16px 16px 10px', fontSize: 17, fontWeight: 700, borderBottom: '1px solid #e1e8ed' },
  convRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
    borderBottom: '1px solid #f0f3f4',
  },
  convRowActive: { background: '#e8f5fd' },
  convAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#1d9bf0',
    color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  convMeta: { flex: 1, minWidth: 0 },
  convName: { fontWeight: 600, fontSize: 14, color: '#14171a', display: 'flex', alignItems: 'center', gap: 6 },
  convPreview: { fontSize: 12, color: '#657786', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: '50%', background: '#1d9bf0', display: 'inline-block' },
  right: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  threadHeader: {
    padding: '14px 16px', fontWeight: 700, fontSize: 16,
    borderBottom: '1px solid #e1e8ed', flexShrink: 0,
  },
  thread: { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  bubble: { maxWidth: '70%', display: 'flex', flexDirection: 'column' },
  bubbleMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubbleName: { fontSize: 11, color: '#657786', marginBottom: 2 },
  bubbleText: {
    background: '#e8f5fd', color: '#14171a', padding: '8px 12px',
    borderRadius: '18px 18px 18px 4px', fontSize: 14, lineHeight: 1.4,
  },
  bubbleTextMine: {
    background: '#1d9bf0', color: '#fff', padding: '8px 12px',
    borderRadius: '18px 18px 4px 18px', fontSize: 14, lineHeight: 1.4,
  },
  bubbleTime: { fontSize: 11, color: '#8899a6', marginTop: 3 },
  inputRow: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderTop: '1px solid #e1e8ed', flexShrink: 0,
  },
  messageInput: {
    flex: 1, padding: '10px 14px', border: '1px solid #e1e8ed', borderRadius: 24,
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  },
  sendButton: {
    padding: '10px 20px', background: '#1d9bf0', color: '#fff', border: 'none',
    borderRadius: 24, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
  },
  empty: { padding: 24, color: '#657786', fontSize: 14, textAlign: 'center' },
};
