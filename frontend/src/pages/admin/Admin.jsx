import React, { useState } from 'react';
import Layout from '../../components/Layout';
import UsersTab     from './tabs/UsersTab';
import ClientsTab   from './tabs/ClientsTab';
import ParametresTab from './tabs/ParametresTab';
import t from '../../styles/theme';

const TABS = [
  {
    id: 'users', label: 'Utilisateurs',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: 'clients', label: 'Clients',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'parametres', label: 'Paramètres',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  },
];

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <Layout title="Administration">
      <div style={{ fontFamily: t.fontFamily }}>

        {/* ── Onglets ── */}
        <div style={{
          background: '#fff', borderRadius: t.radiusLg,
          padding: 6, marginBottom: 16,
          boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          display: 'flex', gap: 4,
        }}>
          {TABS.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                style={{
                  flex: 1, height: 40,
                  border: 'none', borderRadius: t.radiusMd,
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? t.primary : 'transparent',
                  color: active ? '#fff' : t.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.18s',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.6 }}>{tb.icon}</span>
                {tb.label}
              </button>
            );
          })}
        </div>

        {tab === 'users'      && <UsersTab />}
        {tab === 'clients'    && <ClientsTab />}
        {tab === 'parametres' && <ParametresTab />}
      </div>
    </Layout>
  );
}
