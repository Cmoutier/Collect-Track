import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/alertes?traitee=false&limit=5'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setAlertes(a.data.alertes);
    }).finally(() => setLoading(false));
  }, []);

  const traiterAlerte = async (id) => {
    await api.put(`/dashboard/alertes/${id}/traiter`);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) return <Layout title="Dashboard"><div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div></Layout>;

  return (
    <Layout title="Tableau de bord">
      <div>
        {/* Date + export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ color: '#64748b', fontSize: 14 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <a
            href="/api/export/excel"
            target="_blank"
            style={{
              background: '#1d4ed8', color: '#fff', padding: '8px 14px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}
          >
            📊 Exporter Excel
          </a>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total aujourd'hui" value={stats.total} color="#1d4ed8" />
            <StatCard label="Conformes" value={stats.conformes} color="#22c55e"
              sub={stats.tauxConformite !== null ? `${stats.tauxConformite}% conformité` : null} />
            <StatCard label="Hors marge" value={stats.horsMarge} color="#f97316" />
            <StatCard label="Incidents" value={stats.incidents} color="#ef4444"
              sub={stats.alertesActives > 0 ? `${stats.alertesActives} alertes actives` : null} />
          </div>
        )}

        {/* Taux conformité */}
        {stats?.tauxConformite !== null && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Taux de conformité</span>
              <span style={{ fontWeight: 700, color: stats.tauxConformite >= 90 ? '#22c55e' : stats.tauxConformite >= 70 ? '#f97316' : '#ef4444' }}>
                {stats.tauxConformite}%
              </span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 999, height: 12 }}>
              <div style={{
                width: `${stats.tauxConformite}%`, height: '100%', borderRadius: 999,
                background: stats.tauxConformite >= 90 ? '#22c55e' : stats.tauxConformite >= 70 ? '#f97316' : '#ef4444',
                transition: 'width 0.6s',
              }} />
            </div>
          </div>
        )}

        {/* Évolution 7 jours */}
        {stats?.evolution && stats.evolution.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Évolution 7 jours</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
              {stats.evolution.map((d) => {
                const maxVal = Math.max(...stats.evolution.map((e) => e.total), 1);
                const h = Math.round((d.total / maxVal) * 64) + 4;
                return (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '80%', height: h, background: '#1d4ed8', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                      {new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{d.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alertes non traitées */}
        {alertes.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, color: '#1e293b' }}>🔔 Alertes récentes</h3>
              <Link to="/historique" style={{ fontSize: 13, color: '#1d4ed8' }}>Tout voir</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertes.map((a) => (
                <div key={a.id} style={{
                  background: a.type === 'incident' ? '#fef2f2' : a.type === 'manquant' ? '#f8fafc' : '#fff7ed',
                  border: `1px solid ${a.type === 'incident' ? '#fecaca' : a.type === 'manquant' ? '#e2e8f0' : '#fed7aa'}`,
                  borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                      {a.type === 'incident' ? '🚨' : a.type === 'manquant' ? '❓' : '⚠️'} {a.message}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(a.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <button
                    onClick={() => traiterAlerte(a.id)}
                    style={{
                      background: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 10px',
                      fontSize: 12, cursor: 'pointer', flexShrink: 0, marginLeft: 8,
                    }}
                  >
                    Traiter
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides admin */}
        {user?.role === 'admin' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>⚙️ Administration</h3>
            <Link to="/admin" style={{
              display: 'block', height: 48, lineHeight: '48px', textAlign: 'center',
              background: '#1d4ed8', color: '#fff', borderRadius: 10, textDecoration: 'none',
              fontWeight: 600,
            }}>
              Gérer les utilisateurs et clients
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
