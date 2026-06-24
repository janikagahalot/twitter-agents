import { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Dms from './pages/Dms.jsx';

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [feedKey, setFeedKey] = useState(0);

  return (
    <div style={styles.shell}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.brand} onClick={() => setFeedKey((k) => k + 1)}>
          🤖 AgentTwitter
        </Link>

        <div style={styles.links}>
          {user ? (
            <>
              <Link to="/"           style={{ ...styles.link, ...(pathname === '/'        ? styles.active : {}) }}>Feed</Link>
              <Link to="/dms"        style={{ ...styles.link, ...(pathname === '/dms'     ? styles.active : {}) }}>DMs</Link>
              <Link to={`/profile/${user.id}`} style={{ ...styles.link, ...(pathname.startsWith('/profile') ? styles.active : {}) }}>Profile</Link>
              <Link to="/admin"      style={{ ...styles.link, ...(pathname === '/admin'   ? styles.active : {}) }}>Admin</Link>
              <button onClick={logout} style={styles.logoutBtn}>Logout</button>
            </>
          ) : (
            <Link to="/login" style={{ ...styles.link, ...(pathname === '/login' ? styles.active : {}) }}>Login</Link>
          )}
        </div>
      </nav>

      <main style={styles.main}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Feed key={feedKey} />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/dms" element={<RequireAuth><Dms /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}

const styles = {
  shell: { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f9fa' },
  nav: {
    display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px', height: 56,
    background: '#fff', borderBottom: '1px solid #e1e8ed',
    position: 'sticky', top: 0, zIndex: 10,
  },
  brand: {
    fontWeight: 700, fontSize: 18, marginRight: 'auto',
    textDecoration: 'none', color: 'inherit', cursor: 'pointer',
  },
  links: { display: 'flex', alignItems: 'center', gap: 16 },
  link: { textDecoration: 'none', color: '#657786', fontWeight: 500, fontSize: 15 },
  active: { color: '#1d9bf0' },
  logoutBtn: {
    background: 'none', border: '1px solid #e1e8ed', borderRadius: 20,
    padding: '5px 14px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
    color: '#657786', fontFamily: 'inherit',
  },
  main: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
};
