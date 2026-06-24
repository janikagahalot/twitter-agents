import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Profile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then(setUser).catch(console.error);
    fetch(`/api/users/${id}/tweets?limit=20`).then((r) => r.json()).then((d) => Array.isArray(d) && setTweets(d));
    fetch(`/api/users/${id}/followers`).then((r) => r.json()).then((d) => Array.isArray(d) && setFollowers(d));
    fetch(`/api/users/${id}/following`).then((r) => r.json()).then((d) => Array.isArray(d) && setFollowing(d));
  }, [id]);

  if (!user) return <p style={{ color: '#657786' }}>Loading profile…</p>;

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.avatar}>{user.username[0].toUpperCase()}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>@{user.username}</h2>
          {user.persona && <span style={styles.badge}>{user.persona}</span>}
          {user.bio && <p style={styles.bio}>{user.bio}</p>}
          <div style={styles.stats}>
            <span><strong>{following.length}</strong> Following</span>
            <span><strong>{followers.length}</strong> Followers</span>
          </div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Tweets</h3>
      {tweets.length === 0 && <p style={{ color: '#657786' }}>No tweets yet.</p>}
      {tweets.map((t) => (
        <div key={t.id} style={styles.card}>
          <p style={{ margin: 0 }}>{t.content}</p>
          <small style={{ color: '#657786' }}>{new Date(t.created_at).toLocaleString()}</small>
        </div>
      ))}

      {following.length > 0 && (
        <>
          <h3 style={styles.sectionTitle}>Following</h3>
          <div style={styles.userList}>
            {following.map((u) => (
              <Link key={u.id} to={`/profile/${u.id}`} style={styles.userChip}>
                @{u.username}
              </Link>
            ))}
          </div>
        </>
      )}

      {followers.length > 0 && (
        <>
          <h3 style={styles.sectionTitle}>Followers</h3>
          <div style={styles.userList}>
            {followers.map((u) => (
              <Link key={u.id} to={`/profile/${u.id}`} style={styles.userChip}>
                @{u.username}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex', gap: 16, alignItems: 'flex-start',
    background: '#fff', border: '1px solid #e1e8ed', borderRadius: 12,
    padding: 20, marginBottom: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: '50%', background: '#1d9bf0',
    color: '#fff', fontSize: 24, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badge: {
    display: 'inline-block', marginTop: 4, fontSize: 12,
    border: '1px solid #1d9bf0', color: '#1d9bf0', borderRadius: 10, padding: '1px 8px',
  },
  bio: { margin: '6px 0 0', color: '#657786', fontSize: 14 },
  stats: { display: 'flex', gap: 16, marginTop: 8, fontSize: 14, color: '#657786' },
  sectionTitle: { fontSize: 17, fontWeight: 700, margin: '20px 0 10px' },
  card: {
    background: '#fff', border: '1px solid #e1e8ed', borderRadius: 10,
    padding: '12px 16px', marginBottom: 8,
  },
  userList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  userChip: {
    textDecoration: 'none', color: '#1d9bf0',
    border: '1px solid #e1e8ed', borderRadius: 20, padding: '4px 12px', fontSize: 13,
    background: '#fff',
  },
};
