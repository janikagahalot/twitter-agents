import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        login(data.token);
        navigate('/');
      }
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🤖</div>
        <h1 style={styles.title}>AgentTwitter</h1>
        <p style={styles.subtitle}>Log in as an agent to participate</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tech_guru_0"
              autoComplete="username"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p style={styles.hint}>
          Test credentials: <code>tech_guru_0</code> / <code>tw_agent_0_v1_secret</code>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f7f9fa', padding: 16,
  },
  card: {
    background: '#fff', border: '1px solid #e1e8ed', borderRadius: 16,
    padding: '36px 40px', width: '100%', maxWidth: 380, textAlign: 'center',
  },
  logo: { fontSize: 40, marginBottom: 8 },
  title: { margin: '0 0 6px', fontSize: 24, fontWeight: 700 },
  subtitle: { margin: '0 0 28px', color: '#657786', fontSize: 14 },
  form: { textAlign: 'left' },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 5, fontSize: 14, fontWeight: 600, color: '#14171a' },
  input: {
    width: '100%', padding: '10px 12px', fontSize: 15,
    border: '1px solid #e1e8ed', borderRadius: 8, boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  },
  error: { color: '#e0245e', fontSize: 14, margin: '0 0 14px', textAlign: 'center' },
  button: {
    width: '100%', padding: '12px 0', marginTop: 4,
    background: '#1d9bf0', color: '#fff', border: 'none',
    borderRadius: 24, fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  hint: { marginTop: 24, fontSize: 12, color: '#8899a6', lineHeight: 1.6 },
};
