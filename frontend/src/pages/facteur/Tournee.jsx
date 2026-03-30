import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';

const JOURS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function TourneePage() {
  const [clients, setClients] = useState([]);
  const [tournee, setTournee] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/collectes/tournee/today')
      .then(({ data }) => {
        setTournee(data.tournee);
        setClients(data.clients || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Ma tournée">
      <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</div>
    </Layout>
  );

  const scanned = clients.filter((c) => c.scanne).length;
  const total = clients.length;
  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <Layout title="Ma tournée du jour">
      {/* Progression */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>{scanned} / {total} collectes</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? '#22c55e' : '#1d4ed8' }}>{pct}%</span>
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: 999, height: 10 }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 999,
            background: pct === 100 ? '#22c55e' : '#1d4ed8',
            transition: 'width 0.4s',
          }} />
        </div>
      </div>

      {/* Liste */}
      {clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p>Aucune tournée planifiée pour aujourd'hui</p>
          <button
            onClick={() => navigate('/scan')}
            style={{ marginTop: 16, height: 48, background: '#1d4ed8', color: '#fff',
              border: 'none', borderRadius: 10, padding: '0 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Scanner manuellement
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clients.map((client, idx) => (
            <div key={client.id} style={{
              background: '#fff', borderRadius: 12, padding: 14,
              border: `2px solid ${client.scanne ? '#22c55e' : '#e2e8f0'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: client.scanne ? '#22c55e' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: client.scanne ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 14,
              }}>
                {client.scanne ? '✓' : idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{client.nom}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{client.adresse}, {client.ville}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {client.heureDebut} - {client.heureFin}
                </div>
              </div>
              {!client.scanne && (
                <button
                  onClick={() => navigate('/scan')}
                  style={{
                    height: 40, background: '#1d4ed8', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '0 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Scanner
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
