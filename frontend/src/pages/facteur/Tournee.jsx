import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import t from '../../styles/theme';

const JOURS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function TourneePage() {
  const [clients,  setClients]  = useState([]);
  const [tournee,  setTournee]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/collectes/tournee/today')
      .then(({ data }) => { setTournee(data.tournee); setClients(data.clients || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Ma tournée">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{ color: t.textMuted, fontSize: 14 }}>Chargement…</div>
      </div>
    </Layout>
  );

  const scanned = clients.filter((c) => c.scanne).length;
  const total   = clients.length;
  const pct     = total > 0 ? Math.round((scanned / total) * 100) : 0;
  const done    = pct === 100 && total > 0;

  return (
    <Layout title="Ma tournée du jour">
      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: t.fontFamily }}>

        {/* ── Barre de progression ── */}
        <div style={{
          background: '#fff',
          borderRadius: t.radiusLg,
          padding: '16px 20px',
          marginBottom: 14,
          boxShadow: t.shadowCard,
          border: `1px solid ${t.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 22, color: done ? t.success : t.primary }}>{scanned}</span>
              <span style={{ fontSize: 14, color: t.textMuted }}> / {total} collectes</span>
            </div>
            <div style={{
              fontWeight: 700, fontSize: 15,
              color: done ? t.success : t.primary,
              background: done ? t.successBg : t.primaryBg,
              padding: '3px 10px', borderRadius: t.radiusFull,
            }}>
              {pct}%
            </div>
          </div>
          {/* Barre */}
          <div style={{ background: t.border, borderRadius: t.radiusFull, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: done
                ? `linear-gradient(90deg, ${t.success}, #4ADE80)`
                : `linear-gradient(90deg, ${t.primary}, ${t.primaryLight})`,
              borderRadius: t.radiusFull,
              transition: 'width 0.5s ease',
            }} />
          </div>
          {done && (
            <div style={{ textAlign: 'center', marginTop: 10, color: t.success, fontWeight: 600, fontSize: 13 }}>
              ✓ Tournée complète !
            </div>
          )}
        </div>

        {/* ── Liste ── */}
        {clients.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: t.radiusLg, padding: 32,
            textAlign: 'center', boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: t.radiusLg,
              background: t.primaryBg, margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <p style={{ color: t.textMuted, fontSize: 14, marginBottom: 20 }}>
              Aucune tournée planifiée aujourd'hui
            </p>
            <button
              onClick={() => navigate('/scan')}
              style={{
                height: 46, background: t.primary, color: '#fff',
                border: 'none', borderRadius: t.radiusMd,
                padding: '0 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Scanner manuellement
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clients.map((client, idx) => (
              <div key={client.id} style={{
                background: '#fff',
                borderRadius: t.radiusLg,
                padding: '14px 16px',
                border: `1.5px solid ${client.scanne ? t.successBorder : t.border}`,
                boxShadow: t.shadowCard,
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'border-color 0.2s',
              }}>
                {/* Numéro / check */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: client.scanne ? t.success : t.primaryBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: client.scanne ? '#fff' : t.primary,
                  fontWeight: 800, fontSize: 14,
                  border: `2px solid ${client.scanne ? t.success : t.primaryBorder}`,
                }}>
                  {client.scanne ? '✓' : idx + 1}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 15, color: t.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {client.nom}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    {client.adresse}, {client.ville}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 4,
                    fontSize: 11, fontWeight: 600, color: t.primary,
                    background: t.primaryBg, padding: '2px 8px', borderRadius: t.radiusFull,
                  }}>
                    {client.heureDebut} – {client.heureFin}
                  </div>
                </div>

                {!client.scanne && (
                  <button
                    onClick={() => navigate('/scan')}
                    style={{
                      height: 40, background: t.primary, color: '#fff',
                      border: 'none', borderRadius: t.radiusMd,
                      padding: '0 14px', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Scanner
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
