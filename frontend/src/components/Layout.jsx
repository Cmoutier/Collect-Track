import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const NAV_FACTEUR = [
  { path: '/scan', label: '📷 Scanner' },
  { path: '/tournee', label: '📋 Ma tournée' },
];
const NAV_MANAGER = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/historique', label: '📋 Historique' },
];
const NAV_ADMIN = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/historique', label: '📋 Historique' },
  { path: '/admin', label: '⚙️ Administration' },
];

export default function Layout({ children, title }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user?.role === 'facteur' ? NAV_FACTEUR
    : user?.role === 'manager' ? NAV_MANAGER
    : NAV_ADMIN;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: '#1d4ed8', color: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Collect&amp;Track</div>
          {title && <div style={{ fontSize: 13, opacity: 0.85 }}>{title}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13 }}>{user?.prenom} {user?.nom}</span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: 16, maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav style={{
        background: '#1e3a8a', display: 'flex', borderTop: '1px solid #1d4ed8',
      }}>
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} style={{
            flex: 1, textAlign: 'center', padding: '12px 4px',
            color: location.pathname === item.path ? '#93c5fd' : '#cbd5e1',
            textDecoration: 'none', fontSize: 13, fontWeight: location.pathname === item.path ? 700 : 400,
            borderTop: location.pathname === item.path ? '3px solid #93c5fd' : '3px solid transparent',
          }}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
