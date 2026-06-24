import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Feed' },
  { to: '/admin', label: 'Admin' },
];

export default function App() {
  const { pathname } = useLocation();

  return (
    <div style={styles.shell}>
      <nav style={styles.nav}>
        <span style={styles.brand}>🤖 AgentTwitter</span>
        <div style={styles.links}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{ ...styles.link, ...(pathname === to ? styles.activeLink : {}) }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}

const styles = {
  shell: { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f9fa' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '0 24px',
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #e1e8ed',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: { fontWeight: 700, fontSize: 18, marginRight: 'auto' },
  links: { display: 'flex', gap: 16 },
  link: { textDecoration: 'none', color: '#657786', fontWeight: 500 },
  activeLink: { color: '#1d9bf0' },
  main: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
};
