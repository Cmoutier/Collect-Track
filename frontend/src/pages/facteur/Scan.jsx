import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';

export default function ScanPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { statut, message, collecte }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [facteurs, setFacteurs] = useState([]);
  const [facteurSelectionne, setFacteurSelectionne] = useState('');
  const [defaultFacteurId, setDefaultFacteurId] = useState(null);

  useEffect(() => {
    // Charger la liste des facteurs et le paramètre facteur_defaut_id
    const init = async () => {
      try {
        const [usersRes, paramsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/parametres'),
        ]);
        const facteursList = usersRes.data.filter((u) => u.role === 'facteur' && u.actif);
        setFacteurs(facteursList);

        const defParam = paramsRes.data.find((p) => p.cle === 'facteur_defaut_id');
        const defId = defParam?.valeur ? parseInt(defParam.valeur) : null;
        setDefaultFacteurId(defId);

        // Pré-sélection : facteur par défaut, sinon le facteur connecté si role facteur
        if (defId && facteursList.find((f) => f.id === defId)) {
          setFacteurSelectionne(String(defId));
        } else if (user?.role === 'facteur') {
          setFacteurSelectionne(String(user.id));
        }
      } catch {
        // Non bloquant — si pas accès admin, on utilise l'utilisateur courant
        if (user?.role === 'facteur') {
          setFacteurSelectionne(String(user.id));
        }
      }
    };
    init();
  }, []);

  const startScanner = async () => {
    setResult(null);
    setError('');
    setScanning(true);

    try {
      html5QrRef.current = new Html5Qrcode('qr-reader');
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
      );
    } catch (e) {
      setError("Impossible d'accéder à la caméra : " + e.message);
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

  const onScanSuccess = async (decodedText) => {
    await stopScanner();
    setLoading(true);
    try {
      const { data } = await api.post('/collectes/scan', {
        qrCode: decodedText,
        facteurId: facteurSelectionne || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors du scan');
    } finally {
      setLoading(false);
    }
  };

  const couleurStatut = {
    conforme: { bg: '#dcfce7', border: '#22c55e', color: '#166534' },
    hors_marge: { bg: '#fff7ed', border: '#f97316', color: '#9a3412' },
    incident: { bg: '#fef2f2', border: '#ef4444', color: '#991b1b' },
  };

  return (
    <Layout title="Scanner un QR Code">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Sélection facteur */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <label style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Facteur effectuant la collecte
          </label>
          {facteurs.length > 0 ? (
            <select
              value={facteurSelectionne}
              onChange={(e) => setFacteurSelectionne(e.target.value)}
              style={{ width: '100%', height: 48, padding: '0 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 15 }}
            >
              <option value="">-- Sélectionner un facteur --</option>
              {facteurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                  {f.id === defaultFacteurId ? ' (défaut)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ color: '#64748b', fontSize: 14 }}>
              {user?.role === 'facteur' ? `${user.prenom} ${user.nom} (vous)` : 'Chargement...'}
            </div>
          )}
        </div>

        {/* Zone scanner */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div id="qr-reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden', minHeight: scanning ? 280 : 0 }} />

          {!scanning && !result && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>📷</div>
              <p style={{ color: '#64748b', marginBottom: 20 }}>Positionnez le QR code dans le cadre</p>
              <button
                onClick={startScanner}
                disabled={loading}
                style={{
                  width: '100%', height: 56, background: '#1d4ed8', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,78,216,0.4)',
                }}
              >
                📷 Démarrer le scan
              </button>
            </div>
          )}

          {scanning && (
            <button
              onClick={stopScanner}
              style={{
                width: '100%', height: 48, marginTop: 12, background: '#ef4444', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: '#1d4ed8', fontWeight: 600 }}>
              Enregistrement en cours...
            </div>
          )}
        </div>

        {/* Résultat */}
        {result && (() => {
          const s = couleurStatut[result.statut] || couleurStatut.conforme;
          return (
            <div style={{
              background: s.bg, border: `2px solid ${s.border}`, borderRadius: 12,
              padding: 20, marginBottom: 16,
            }}>
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>
                {result.statut === 'conforme' ? '✅' : result.statut === 'hors_marge' ? '⚠️' : '🚨'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, color: s.color, textAlign: 'center', marginBottom: 8 }}>
                {result.message}
              </div>
              <div style={{ color: '#374151', fontSize: 14 }}>
                <div><b>Client :</b> {result.collecte?.client?.nom}</div>
                <div><b>Adresse :</b> {result.collecte?.client?.adresse}, {result.collecte?.client?.ville}</div>
                <div><b>Heure :</b> {new Date(result.collecte?.heureCollecte).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => { setResult(null); setError(''); }}
                  style={{
                    flex: 1, height: 48, background: '#1d4ed8', color: '#fff',
                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Nouveau scan
                </button>
                {result.statut !== 'incident' && (
                  <button
                    onClick={() => navigate(`/incident/${result.collecte.id}`)}
                    style={{
                      flex: 1, height: 48, background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Signaler incident
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Erreur */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12,
            padding: 16, color: '#991b1b', fontWeight: 600,
          }}>
            ❌ {error}
            <button
              onClick={() => setError('')}
              style={{ display: 'block', marginTop: 10, background: '#ef4444', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
