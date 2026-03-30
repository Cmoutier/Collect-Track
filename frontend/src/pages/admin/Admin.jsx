import React, { useState } from 'react';
import Layout from '../../components/Layout';
import UsersTab from './tabs/UsersTab';
import ClientsTab from './tabs/ClientsTab';
import ParametresTab from './tabs/ParametresTab';

const TABS = [
  { id: 'users', label: '👥 Utilisateurs' },
  { id: 'clients', label: '🏢 Clients' },
  { id: 'parametres', label: '⚙️ Paramètres' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <Layout title="Administration">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#fff', borderRadius: 12, padding: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, height: 40, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            background: tab === t.id ? '#1d4ed8' : 'transparent',
            color: tab === t.id ? '#fff' : '#64748b',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'parametres' && <ParametresTab />}
    </Layout>
  );
}
