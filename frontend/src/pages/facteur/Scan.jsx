import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import t from '../../styles/theme';

const STATUT_CONFIG = {
  conforme:   { bg: t.successBg,  border: t.successBorder,  color: t.success,  icon: '✓', label: 'Conforme'       },
  hors_marge: { bg: t.warningBg,  border: t.warningBorder,  color: t.warning,  icon: '!', label: 'Hors plage horaire' },
  incident:   { bg: t.dangerBg,   border: t.dangerBorder,   color: t.danger,   icon: '✕', label: 'Incident détecté' },
};

export default function ScanPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const html5QrRef = useRef(null);

  const [scanning,     setScanning]     = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [facteurs,     setFacteurs]     = useState([]);
  const [facteurId,    setFacteurId]    = useState('');
  const [defaultId,    setDefaultId]    = useState(null);
  const [pendingCode,    setPendingCode]    = useState(null);
  const [pendingClient,  setPendingClient]  = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [doublonInfo,    setDoublonInfo]    = useState(null);
  const [clientsJour,    setClientsJour]    = useState([]);
  const [systemePause,   setSystemePause]   = useState(false);

  const fetchClientsJour = async () => {
    try {
      const { data } = await api.get('/collectes/tournee/today');
      setClientsJour(data.clients || []);
    } catch {}
  };

  const checkPause = async () => {
    try {
      const { data } = await api.get('/admin/parametres');
      const p = data.find((x) => x.cle === 'systeme_en_pause');
      const paused = p?.valeur === 'true';
      setSystemePause(paused);
      return paused;
    } catch {}
    return false;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [usersRes, paramsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/parametres'),
        ]);
        const list = usersRes.data.filter((u) => u.role === 'facteur' && u.actif);
        setFacteurs(list);
        const pauseParam = paramsRes.data.find((p) => p.cle === 'systeme_en_pause');
        setSystemePause(pauseParam?.valeur === 'true');
        const defParam = paramsRes.data.find((p) => p.cle === 'facteur_defaut_id');
        const defId = defParam?.valeur ? parseInt(defParam.valeur) : null;
        setDefaultId(defId);
        if (defId && list.find((f) => f.id === defId)) {
          setFacteurId(String(defId));
        } else if (user?.role === 'facteur') {
          setFacteurId(String(user.id));
        }
      } catch {
        if (user?.role === 'facteur') setFacteurId(String(user.id));
      }
    };
    init();
    fetchClientsJour();
    const interval = setInterval(checkPause, 30000);
    return () => clearInterval(interval);
  }, []);

  const startScanner = async () => {
    const paused = await checkPause();
    if (paused) return;
    setResult(null); setError('');
    setScanning(true);
    try {
      html5QrRef.current = new Html5Qrcode('qr-reader');
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScanSuccess,
        () => {}
      );
    } catch (e) {
      setError("Impossible d'accéder à la caméra.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  // Appelé par html5-qrcode quand un QR est détecté : pause + lookup client
  const onScanSuccess = async (code) => {
    await stopScanner();
    setPendingCode(code);
    setPendingClient(null);
    setPreviewLoading(true);
    try {
      const { data } = await api.get(`/collectes/preview?qrCode=${encodeURIComponent(code)}`);
      setPendingClient(data);
    } catch (e) {
      // Client inconnu ou erreur : on affiche quand même la confirmation
      setPendingClient(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirmer le scan (après la pause, ou après confirmation doublon)
  const confirmerScan = async (code, force = false) => {
    setPendingCode(null);
    setPendingClient(null);
    setDoublonInfo(null);
    setLoading(true);
    try {
      const { data } = await api.post('/collectes/scan', {
        qrCode: code,
        facteurId: facteurId || undefined,
        ...(force ? { force: true } : {}),
      });
      setResult(data);
      fetchClientsJour(); // Rafraîchir la liste après scan
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.alreadyScanned) {
        // Doublon : on demande confirmation
        setDoublonInfo({ ...e.response.data, code });
      } else {
        setError(e.response?.data?.error || 'Erreur lors du scan');
      }
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (STATUT_CONFIG[result.statut] || STATUT_CONFIG.conforme) : null;

  return (
    <Layout title="Scanner une collecte">
      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: t.fontFamily }}>

        {/* ── Bannière pause ── */}
        {systemePause && (
          <div style={{
            background: t.dangerBg, border: `1.5px solid ${t.dangerBorder}`,
            borderRadius: t.radiusLg, padding: '14px 16px', marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: t.danger }}>⏸ Système en pause</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              Le service de collecte est temporairement suspendu. Les scans ne sont pas enregistrés.
            </div>
          </div>
        )}

        {/* ── Sélection facteur ── */}
        <div style={card}>
          <label style={sectionLabel}>Facteur effectuant la collecte</label>
          {facteurs.length > 0 ? (
            <select
              value={facteurId}
              onChange={(e) => setFacteurId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Sélectionner —</option>
              {facteurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}{f.id === defaultId ? ' ★' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ color: t.textSecondary, fontSize: 14, padding: '8px 0' }}>
              {user?.role === 'facteur' ? `${user.prenom} ${user.nom}` : 'Chargement…'}
            </div>
          )}
        </div>

        {/* ── Zone scanner ── */}
        <div style={card}>
          {systemePause && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏸</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: t.danger, marginBottom: 8 }}>
                Service suspendu
              </div>
              <div style={{ fontSize: 14, color: t.textMuted }}>
                Le service de collecte est temporairement à l'arrêt.<br />
                Contactez votre responsable pour plus d'informations.
              </div>
            </div>
          )}
          {!systemePause && (<>
          {/* Viewfinder QR */}
          <div
            id="qr-reader"
            style={{
              width: '100%',
              borderRadius: t.radiusMd,
              overflow: 'hidden',
              minHeight: scanning ? 300 : 0,
              background: '#000',
            }}
          />

          {!scanning && !result && !loading && (
            <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
              {/* Illustration cadre QR */}
              <div style={{
                width: 100, height: 100, margin: '0 auto 16px',
                borderRadius: t.radiusLg,
                background: t.primaryBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.5">
                  <rect x="3" y="3" width="5" height="5" rx="1"/>
                  <rect x="16" y="3" width="5" height="5" rx="1"/>
                  <rect x="3" y="16" width="5" height="5" rx="1"/>
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                  <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                  <path d="M3 12h.01"/><path d="M12 3h.01"/>
                </svg>
              </div>
              <p style={{ color: t.textMuted, fontSize: 14, marginBottom: 20 }}>
                Pointez la caméra vers le QR Code du client
              </p>
              <button onClick={startScanner} disabled={systemePause} style={{ ...btnPrimary, opacity: systemePause ? 0.4 : 1, cursor: systemePause ? 'not-allowed' : 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Démarrer le scan
              </button>
            </div>
          )}

          {scanning && (
            <>
              <p style={{ textAlign: 'center', color: t.textMuted, fontSize: 13, margin: '12px 0 8px' }}>
                Cadrez le QR Code dans le viseur…
              </p>
              <button onClick={stopScanner} style={btnDanger}>Annuler</button>
            </>
          )}

          {/* ── QR détecté : attente confirmation ── */}
          {pendingCode && !loading && (
            <div style={{ padding: '16px 4px 4px' }}>
              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: t.textMuted, fontSize: 14 }}>
                  Identification du client…
                </div>
              ) : (
                <>
                  {/* Info client */}
                  <div style={{
                    background: pendingClient ? t.primaryBg : t.bgPage,
                    border: `1.5px solid ${pendingClient ? t.primaryBorder : t.border}`,
                    borderRadius: t.radiusMd,
                    padding: '14px 16px',
                    marginBottom: 16,
                  }}>
                    {pendingClient ? (
                      <>
                        <div style={{ fontWeight: 800, fontSize: 16, color: t.primary, marginBottom: 4 }}>
                          {pendingClient.nom}
                        </div>
                        <div style={{ fontSize: 13, color: t.textSecondary }}>
                          {pendingClient.adresse}, {pendingClient.ville}
                        </div>
                        <div style={{
                          marginTop: 10, paddingTop: 10,
                          borderTop: `1px solid ${t.primaryBorder}`,
                          fontSize: 12, color: t.textSecondary,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2.5">
                            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                          </svg>
                          Plage attendue : <strong style={{ color: t.primary }}>
                            {pendingClient.heureDebut} – {pendingClient.heureFin}
                          </strong>
                          <span style={{ color: t.textMuted }}>(±{pendingClient.margeMinutes} min)</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, color: t.textMuted, textAlign: 'center' }}>
                        Client non identifié
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { setPendingCode(null); setPendingClient(null); }}
                      style={{ ...btnSecondary, flex: 1 }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => confirmerScan(pendingCode)}
                      style={{ ...btnPrimary, flex: 1 }}
                      disabled={!pendingClient}
                    >
                      Confirmer le scan
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ color: t.primary, fontWeight: 600, fontSize: 15 }}>Enregistrement…</div>
            </div>
          )}
          </>)}
        </div>

        {/* ── Résultat ── */}
        {result && cfg && (
          <div style={{
            background: cfg.bg,
            border: `2px solid ${cfg.border}`,
            borderRadius: t.radiusLg,
            padding: 20,
            marginBottom: 12,
          }}>
            {/* Badge statut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: cfg.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700,
              }}>
                {cfg.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: 13, color: t.textSecondary }}>
                  {new Date(result.collecte?.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Infos client */}
            <div style={{
              background: 'rgba(255,255,255,0.6)',
              borderRadius: t.radiusMd,
              padding: '12px 14px',
              marginBottom: result.horaire && result.statut !== 'conforme' ? 10 : 16,
              fontSize: 14,
            }}>
              <div style={{ fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                {result.collecte?.client?.nom}
              </div>
              <div style={{ color: t.textSecondary }}>
                {result.collecte?.client?.adresse}, {result.collecte?.client?.ville}
              </div>
            </div>

            {/* Détail horaire (hors marge ou incident) */}
            {result.horaire && result.statut !== 'conforme' && (
              <div style={{
                background: 'rgba(255,255,255,0.6)',
                borderRadius: t.radiusMd,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: t.textSecondary,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Heure du scan (Paris)</span>
                  <strong style={{ color: cfg.color }}>{result.horaire.heureScan}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Plage attendue</span>
                  <strong>{result.horaire.heureDebut} – {result.horaire.heureFin} (±{result.horaire.marge} min)</strong>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setResult(null); setError(''); }}
                style={{ ...btnSecondary, flex: 1 }}
              >
                Nouveau scan
              </button>
              {result.statut !== 'incident' && (
                <button
                  onClick={() => navigate(`/incident/${result.collecte.id}`)}
                  style={{ ...btnDanger, flex: 1 }}
                >
                  Signaler incident
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Dialog doublon ── */}
        {doublonInfo && (
          <div style={{
            background: t.warningBg,
            border: `2px solid ${t.warningBorder}`,
            borderRadius: t.radiusLg,
            padding: 20, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: t.warning, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}>!</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: t.warning }}>
                  Déjà scanné aujourd'hui
                </div>
                <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
                  <strong>{doublonInfo.clientNom}</strong> a déjà été scanné à{' '}
                  <strong>{doublonInfo.heureExistante}</strong>. Voulez-vous quand même enregistrer ce passage ?
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDoublonInfo(null)}
                style={{ ...btnSecondary, flex: 1 }}
              >
                Non, annuler
              </button>
              <button
                onClick={() => confirmerScan(doublonInfo.code, true)}
                style={{ ...btnBase, flex: 1, background: t.warning, color: '#fff' }}
              >
                Oui, enregistrer
              </button>
            </div>
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div style={{
            background: t.dangerBg,
            border: `2px solid ${t.dangerBorder}`,
            borderRadius: t.radiusLg,
            padding: 16,
            color: t.danger,
            fontWeight: 600,
            fontSize: 14,
          }}>
            {error}
            <button
              onClick={() => setError('')}
              style={{ display: 'block', marginTop: 10, ...btnDanger }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* ── Liste chronologique du jour ── */}
        {clientsJour.length > 0 && (
          <div style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>
              Tournée du jour — {clientsJour.filter((c) => c.collecteToday).length}/{clientsJour.length} effectué(s)
            </div>

            {/* Barre de progression */}
            <div style={{ background: t.border, borderRadius: t.radiusFull, height: 6, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.round((clientsJour.filter((c) => c.collecteToday).length / clientsJour.length) * 100)}%`,
                height: '100%', borderRadius: t.radiusFull,
                background: `linear-gradient(90deg, ${t.primary}, ${t.primaryLight})`,
                transition: 'width 0.4s ease',
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clientsJour.map((c, i) => {
                const collecte = c.collecteToday;
                const statutCfg = collecte ? {
                  conforme:   { color: t.success,  bg: t.successBg,  dot: '#22C55E', label: '✓' },
                  hors_marge: { color: t.warning,  bg: t.warningBg,  dot: '#F59E0B', label: '!' },
                  incident:   { color: t.danger,   bg: t.dangerBg,   dot: '#EF4444', label: '✕' },
                }[collecte.statut] : null;

                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: collecte ? (statutCfg?.bg || t.bgPage) : t.bgPage,
                    borderRadius: t.radiusMd,
                    border: `1px solid ${collecte ? (statutCfg?.dot + '44') : t.border}`,
                    opacity: collecte ? 1 : 0.75,
                  }}>
                    {/* Numéro d'ordre */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: collecte ? (statutCfg?.color || t.primary) : t.border,
                      color: collecte ? '#fff' : t.textMuted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: collecte ? 12 : 11, fontWeight: 700,
                    }}>
                      {collecte ? statutCfg?.label : i + 1}
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13,
                        color: collecte ? (statutCfg?.color || t.textPrimary) : t.textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.nom}
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>
                        {c.heureDebut} – {c.heureFin}
                        {collecte && (
                          <span style={{ marginLeft: 6, color: statutCfg?.color }}>
                            · scanné {new Date(collecte.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const card = {
  background: '#fff',
  borderRadius: t.radiusLg,
  padding: 16,
  marginBottom: 14,
  boxShadow: t.shadowCard,
  border: `1px solid ${t.border}`,
};
const sectionLabel = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: t.textMuted, letterSpacing: '0.6px',
  textTransform: 'uppercase', marginBottom: 10,
};
const selectStyle = {
  width: '100%', height: 48, padding: '0 12px',
  border: `1.5px solid ${t.border}`,
  borderRadius: t.radiusMd, fontSize: 15,
  color: t.textPrimary, background: '#fff',
  outline: 'none', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A9484' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 40,
};
const btnBase = {
  height: 50, border: 'none', borderRadius: t.radiusMd,
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', transition: 'opacity 0.15s',
};
const btnPrimary  = { ...btnBase, background: t.primary,    color: '#fff', boxShadow: `0 4px 12px ${t.primary}44` };
const btnSecondary= { ...btnBase, background: t.primaryBg,  color: t.primary, border: `1.5px solid ${t.primaryBorder}` };
const btnDanger   = { ...btnBase, background: t.danger,     color: '#fff' };
