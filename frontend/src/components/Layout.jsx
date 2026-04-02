import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import t from '../styles/theme';
import logoStepPost from '../assets/Logo vert - STEP POST - RVB.jpg';

const NAV_FACTEUR  = [
  { path: '/scan',     icon: '⬡', label: 'Scanner'   },
  { path: '/tournee',  icon: '◎', label: 'Tournée'   },
];
const NAV_MANAGER  = [
  { path: '/scan',       icon: '⬡', label: 'Scanner'    },
  { path: '/dashboard',  icon: '⬡', label: 'Dashboard'  },
  { path: '/historique', icon: '◎', label: 'Historique' },
];
const NAV_ADMIN = [
  { path: '/dashboard',  icon: '⬡', label: 'Dashboard'  },
  { path: '/historique', icon: '◎', label: 'Historique'  },
  { path: '/admin',      icon: '◈', label: 'Admin'       },
];

// Icônes SVG inline (pas de dépendance externe)
const icons = {
  scan: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
      <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
      <path d="M12 21v-1"/>
    </svg>
  ),
  list: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  history: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      <path d="M12 2v2m0 18v-2M2 12h2m18 0h-2"/>
    </svg>
  ),
};

const NAV_ICONS = {
  '/scan':       icons.scan,
  '/tournee':    icons.list,
  '/dashboard':  icons.dashboard,
  '/historique': icons.history,
  '/admin':      icons.settings,
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [narrow, setNarrow] = useState(window.innerWidth < 520);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 520);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navItems = user?.role === 'facteur' ? NAV_FACTEUR
    : user?.role === 'manager'  ? NAV_MANAGER
    : NAV_ADMIN;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: t.bgPage, fontFamily: t.fontFamily }}>

      {/* ── Header unique ── */}
      <header style={{
        background: t.primary,
        color: '#fff',
        padding: '0 16px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>

        {/* Logo */}
        <img src={logoStepPost} alt="STEP POST" style={{ height: 30, objectFit: 'contain', flexShrink: 0 }} />

        {/* Nav — centrée */}
        <nav style={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center', height: '100%', minWidth: 0 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: narrow ? 0 : 6,
                padding: narrow ? '0 10px' : '0 14px',
                textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                borderBottom: `3px solid ${active ? '#fff' : 'transparent'}`,
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}>
                <span style={{ display: 'flex', flexShrink: 0 }}>{NAV_ICONS[item.path]}</span>
                {!narrow && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profil + déconnexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!narrow && (
            <span style={{ fontSize: 12, opacity: 0.85, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.prenom} {user?.nom}
            </span>
          )}
          <button onClick={handleLogout} title="Déconnexion" style={{
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)',
            color: '#fff', width: 34, height: 34, borderRadius: t.radiusMd,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            ⏻
          </button>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main style={{ flex: 1, padding: '16px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
