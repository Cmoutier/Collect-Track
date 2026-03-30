import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import t from '../../styles/theme';

function StatCard({ label, value, color, bgColor, sub, icon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: t.radiusLg, padding: '16px 18px',
      boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>
            {value ?? '—'}
          </div>
          {sub && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: t.radiusMd,
            background: bgColor || color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function AlerteBadge({ type }) {
  const map = {
    incident:   { color: t.danger,   bg: t.dangerBg,   label: 'Incident'    },
    hors_marge: { color: t.warning,  bg: t.warningBg,  label: 'Hors marge'  },
    manquant:   { color: t.neutral,  bg: t.neutralBg,  label: 'Manquant'    },
  };
  const s = map[type] || map.manquant;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: s.color,
      background: s.bg, padding: '2px 8px',
      borderRadius: t.radiusFull, flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats,     setStats]     = useState(null);
  const [alertes,   setAlertes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/alertes?traitee=false&limit=5'),
    ]).then(([s, a]) => { setStats(s.data); setAlertes(a.data.alertes); })
      .finally(() => setLoading(false));
  }, []);

  const traiterAlerte = async (id) => {
    await api.put(`/dashboard/alertes/${id}/traiter`);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/export/excel', { responseType: 'blob' });
      const url  = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `collectes-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors de l\'export Excel'); }
    finally { setExporting(false); }
  };

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{ color: t.textMuted }}>Chargement…</div>
      </div>
    </Layout>
  );

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Layout title="Tableau de bord">
      <div style={{ fontFamily: t.fontFamily }}>

        {/* ── En-tête ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: t.textPrimary, textTransform: 'capitalize' }}>
              {today}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              Bonjour, {user?.prenom} 👋
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              height: 38, padding: '0 14px',
              background: exporting ? t.primaryBg : t.primary,
              color: exporting ? t.primary : '#fff',
              border: `1.5px solid ${t.primaryBorder}`,
              borderRadius: t.radiusMd,
              fontSize: 13, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Export…' : 'Excel'}
          </button>
        </div>

        {/* ── 4 stats ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <StatCard
              label="Total"  value={stats.total}
              color={t.secondary} bgColor={t.secondaryBg}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.secondary} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>}
            />
            <StatCard
              label="Conformes" value={stats.conformes}
              color={t.success} bgColor={t.successBg}
              sub={stats.tauxConformite !== null ? `${stats.tauxConformite}%` : null}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
            />
            <StatCard
              label="Hors marge" value={stats.horsMarge}
              color={t.warning} bgColor={t.warningBg}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.warning} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
            <StatCard
              label="Incidents" value={stats.incidents}
              color={t.danger} bgColor={t.dangerBg}
              sub={stats.alertesActives > 0 ? `${stats.alertesActives} alerte${stats.alertesActives > 1 ? 's' : ''}` : null}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
          </div>
        )}

        {/* ── Taux conformité ── */}
        {stats?.tauxConformite !== null && (
          <div style={{
            background: '#fff', borderRadius: t.radiusLg,
            padding: '14px 18px', marginBottom: 16,
            boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>
                Taux de conformité
              </span>
              <span style={{
                fontWeight: 800, fontSize: 15,
                color: stats.tauxConformite >= 90 ? t.success : stats.tauxConformite >= 70 ? t.warning : t.danger,
              }}>
                {stats.tauxConformite}%
              </span>
            </div>
            <div style={{ background: t.border, borderRadius: t.radiusFull, height: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${stats.tauxConformite}%`, height: '100%',
                borderRadius: t.radiusFull,
                background: stats.tauxConformite >= 90
                  ? `linear-gradient(90deg, ${t.success}, #4ADE80)`
                  : stats.tauxConformite >= 70
                  ? `linear-gradient(90deg, ${t.warning}, #FCD34D)`
                  : `linear-gradient(90deg, ${t.danger}, #F87171)`,
                transition: 'width 0.7s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── Évolution 7 jours ── */}
        {stats?.evolution?.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: t.radiusLg,
            padding: '14px 18px', marginBottom: 16,
            boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>
              Évolution — 7 jours
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 72 }}>
              {stats.evolution.map((d) => {
                const maxVal = Math.max(...stats.evolution.map((e) => e.total), 1);
                const h = Math.max(Math.round((d.total / maxVal) * 56), 4);
                const isToday = d.date === new Date().toISOString().split('T')[0];
                return (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>{d.total || ''}</div>
                    <div style={{ height: 56, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{
                        width: '70%', height: h,
                        borderRadius: `${t.radiusSm} ${t.radiusSm} 0 0`,
                        background: isToday
                          ? `linear-gradient(180deg, ${t.primary}, ${t.primaryLight})`
                          : t.primaryBg,
                        border: isToday ? 'none' : `1px solid ${t.primaryBorder}`,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: isToday ? t.primary : t.textMuted, fontWeight: isToday ? 700 : 400, marginTop: 4 }}>
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Alertes récentes ── */}
        {alertes.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: t.radiusLg,
            padding: '14px 18px', marginBottom: 16,
            boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Alertes actives
              </div>
              <Link to="/historique" style={{ fontSize: 12, color: t.primary, fontWeight: 600, textDecoration: 'none' }}>
                Tout voir →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertes.map((a) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: t.bgPage, borderRadius: t.radiusMd,
                  border: `1px solid ${t.border}`,
                }}>
                  <AlerteBadge type={a.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                      {new Date(a.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => traiterAlerte(a.id)}
                    style={{
                      height: 30, padding: '0 10px',
                      background: '#fff', border: `1.5px solid ${t.border}`,
                      borderRadius: t.radiusSm, fontSize: 11, fontWeight: 600,
                      color: t.textSecondary, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Traiter
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lien admin ── */}
        {user?.role === 'admin' && (
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: t.secondaryBg, border: `1.5px solid ${t.secondary}22`,
            borderRadius: t.radiusLg, padding: '14px 18px',
            textDecoration: 'none', color: t.secondary,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Administration</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Gérer utilisateurs, clients, paramètres</div>
            </div>
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
        )}
      </div>
    </Layout>
  );
}
