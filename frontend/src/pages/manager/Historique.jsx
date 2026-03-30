import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import t from '../../styles/theme';

const STATUTS = [
  { value: '',           label: 'Tous les statuts' },
  { value: 'conforme',   label: 'Conforme'          },
  { value: 'hors_marge', label: 'Hors marge'        },
  { value: 'incident',   label: 'Incident'          },
];

const STATUT_STYLE = {
  conforme:   { color: t.success,  bg: t.successBg,  dot: '#22C55E', label: 'Conforme'    },
  hors_marge: { color: t.warning,  bg: t.warningBg,  dot: '#F59E0B', label: 'Hors marge'  },
  incident:   { color: t.danger,   bg: t.dangerBg,   dot: '#EF4444', label: 'Incident'    },
  manquant:   { color: t.neutral,  bg: t.neutralBg,  dot: '#94A3B8', label: 'Manquant'    },
};

export default function HistoriquePage() {
  const [collectes,  setCollectes]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [filters,    setFilters]    = useState({ statut: '', dateDebut: '', dateFin: '', search: '' });

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filters.statut)    params.append('statut',    filters.statut);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin)   params.append('dateFin',   filters.dateFin);
      if (filters.search)    params.append('search',    filters.search);
      const { data } = await api.get(`/dashboard/historique?${params}`);
      setCollectes(data.collectes);
      setTotal(data.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.statut)    params.append('statut',    filters.statut);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin)   params.append('dateFin',   filters.dateFin);
      if (filters.search)    params.append('search',    filters.search);
      const response = await api.get(`/export/excel?${params}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `collectes-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors de l\'export Excel'); }
    finally { setExporting(false); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <Layout title="Historique des collectes">
      <div style={{ fontFamily: t.fontFamily }}>

        {/* ── Filtres ── */}
        <div style={{
          background: '#fff', borderRadius: t.radiusLg,
          padding: '14px 16px', marginBottom: 14,
          boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Filtres
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={filterLabel}>Date début</label>
              <input type="date" value={filters.dateDebut} max={today}
                onChange={(e) => setFilter('dateDebut', e.target.value)}
                style={filterInput} />
            </div>
            <div>
              <label style={filterLabel}>Date fin</label>
              <input type="date" value={filters.dateFin} max={today}
                onChange={(e) => setFilter('dateFin', e.target.value)}
                style={filterInput} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={filterLabel}>Statut</label>
              <select value={filters.statut} onChange={(e) => setFilter('statut', e.target.value)} style={filterInput}>
                {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={filterLabel}>Recherche</label>
              <input type="text" placeholder="Client, facteur…" value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                style={filterInput} />
            </div>
          </div>
        </div>

        {/* ── Barre résultats / export ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
            {loading ? '…' : `${total} collecte${total !== 1 ? 's' : ''}`}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            style={{
              height: 34, padding: '0 14px',
              background: exporting ? t.primaryBg : t.primary,
              color: exporting ? t.primary : '#fff',
              border: `1.5px solid ${t.primaryBorder}`,
              borderRadius: t.radiusMd,
              fontSize: 13, fontWeight: 700,
              cursor: exporting || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Export…' : 'Excel'}
          </button>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: t.textMuted }}>Chargement…</div>
        ) : collectes.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: t.radiusLg,
            padding: 32, textAlign: 'center',
            boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ color: t.textMuted, fontSize: 14 }}>Aucune collecte trouvée</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collectes.map((c) => {
              const st = STATUT_STYLE[c.statut] || STATUT_STYLE.conforme;
              return (
                <div key={c.id} style={{
                  background: '#fff', borderRadius: t.radiusLg,
                  padding: '12px 14px',
                  boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  {/* Dot statut */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: st.dot, flexShrink: 0,
                    boxShadow: `0 0 0 3px ${st.bg}`,
                  }} />

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.client.nom}
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                      {c.facteur.prenom} {c.facteur.nom}
                      {' · '}
                      {new Date(c.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {c.notes && (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notes}
                      </div>
                    )}
                  </div>

                  {/* Droite : statut + date */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: st.color, background: st.bg,
                      padding: '2px 8px', borderRadius: t.radiusFull,
                      display: 'block', marginBottom: 4,
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>
                      {new Date(c.dateCollecte).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={pageBtn(page === 1)}
            >
              ← Précédent
            </button>
            <span style={{ fontSize: 13, color: t.textMuted, padding: '0 4px' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={pageBtn(page === totalPages)}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

const filterLabel = { display: 'block', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 };
const filterInput  = { width: '100%', height: 38, padding: '0 10px', border: `1.5px solid ${t.border}`, borderRadius: t.radiusMd, fontSize: 13, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' };
const pageBtn = (disabled) => ({
  height: 36, padding: '0 16px',
  background: disabled ? t.bgPage : '#fff',
  border: `1.5px solid ${t.border}`,
  borderRadius: t.radiusMd, fontSize: 13, fontWeight: 600,
  color: disabled ? t.textMuted : t.textPrimary,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
