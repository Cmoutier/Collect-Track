import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

const STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'conforme', label: '✅ Conforme' },
  { value: 'hors_marge', label: '⚠️ Hors marge' },
  { value: 'incident', label: '🚨 Incident' },
];

const statutStyle = {
  conforme: { bg: '#dcfce7', color: '#166534' },
  hors_marge: { bg: '#fff7ed', color: '#9a3412' },
  incident: { bg: '#fef2f2', color: '#991b1b' },
  manquant: { bg: '#f1f5f9', color: '#475569' },
};

export default function HistoriquePage() {
  const [collectes, setCollectes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    statut: '',
    dateDebut: '',
    dateFin: '',
    search: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin) params.append('dateFin', filters.dateFin);
      if (filters.search) params.append('search', filters.search);

      const { data } = await api.get(`/dashboard/historique?${params}`);
      setCollectes(data.collectes);
      setTotal(data.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 20);

  const exportUrl = () => {
    const params = new URLSearchParams();
    if (filters.statut) params.append('statut', filters.statut);
    if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
    if (filters.dateFin) params.append('dateFin', filters.dateFin);
    return `/api/export/excel?${params}`;
  };

  return (
    <Layout title="Historique des collectes">
      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Date début</label>
            <input type="date" value={filters.dateDebut} max={today}
              onChange={(e) => { setFilters((f) => ({ ...f, dateDebut: e.target.value })); setPage(1); }}
              style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Date fin</label>
            <input type="date" value={filters.dateFin} max={today}
              onChange={(e) => { setFilters((f) => ({ ...f, dateFin: e.target.value })); setPage(1); }}
              style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select value={filters.statut}
            onChange={(e) => { setFilters((f) => ({ ...f, statut: e.target.value })); setPage(1); }}
            style={inputStyle}>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="text" placeholder="Rechercher client / facteur..."
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
            style={inputStyle} />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>{total} collecte{total !== 1 ? 's' : ''}</div>
        <a href={exportUrl()} target="_blank" style={{
          background: '#1d4ed8', color: '#fff', padding: '7px 12px',
          borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>
          📊 Excel
        </a>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Chargement...</div>
      ) : collectes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Aucune collecte trouvée</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {collectes.map((c) => {
            const st = statutStyle[c.statut] || statutStyle.conforme;
            return (
              <div key={c.id} style={{
                background: '#fff', borderRadius: 10, padding: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <div style={{
                  background: st.bg, color: st.color, borderRadius: 8,
                  padding: '4px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {c.statut === 'conforme' ? '✅' : c.statut === 'hors_marge' ? '⚠️' : c.statut === 'incident' ? '🚨' : '❓'}
                  {' '}{c.statut.replace('_', ' ')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.client.nom}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {c.facteur.prenom} {c.facteur.nom} · {new Date(c.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {c.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{c.notes}</div>}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                  {new Date(c.dateCollecte).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={pageBtn}>‹ Précédent</button>
          <span style={{ padding: '8px 12px', fontSize: 13, color: '#64748b' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtn}>Suivant ›</button>
        </div>
      )}
    </Layout>
  );
}

const inputStyle = { width: '100%', height: 40, padding: '0 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 };
const pageBtn = { height: 36, padding: '0 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 };
