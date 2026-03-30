import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';

const PARAM_LABELS = {
  marge_defaut_minutes: 'Marge horaire par défaut (minutes)',
  alerte_email_active: 'Alertes email activées',
  alerte_email_dest: 'Email destinataire des alertes',
  alerte_hors_marge: 'Alerter pour hors marge',
  alerte_incident: 'Alerter pour incident',
  alerte_manquant: 'Alerter pour collecte manquante',
  heure_verif_manquant: 'Heure de vérification manquants (HH:MM)',
  facteur_defaut_id: 'ID du facteur sélectionné par défaut',
  rapport_auto_actif: 'Rapport journalier automatique',
  rapport_heure: 'Heure d\'envoi du rapport journalier (HH:MM)',
};

const BOOL_PARAMS = ['alerte_email_active', 'alerte_hors_marge', 'alerte_incident', 'alerte_manquant', 'rapport_auto_actif'];

export default function ParametresTab() {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [vals, setVals] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    api.get('/admin/parametres').then(({ data }) => {
      setParams(data);
      const v = {};
      data.forEach((p) => { v[p.cle] = p.valeur; });
      setVals(v);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (cle) => {
    setSaving((s) => ({ ...s, [cle]: true }));
    try {
      await api.put(`/admin/parametres/${cle}`, { valeur: vals[cle] });
      setSaved((s) => ({ ...s, [cle]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [cle]: false })), 2000);
    } catch {}
    finally { setSaving((s) => ({ ...s, [cle]: false })); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Chargement...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Paramètres système</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {params.map((p) => {
          const label = PARAM_LABELS[p.cle] || p.cle;
          const isBool = BOOL_PARAMS.includes(p.cle);
          return (
            <div key={p.cle} style={{
              background: '#fff', borderRadius: 10, padding: 16,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{label}</div>
              {p.description && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{p.description}</div>}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {isBool ? (
                  <select
                    value={vals[p.cle] || 'false'}
                    onChange={(e) => setVals((v) => ({ ...v, [p.cle]: e.target.value }))}
                    style={inputS}
                  >
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                ) : (
                  <input
                    type={p.cle.includes('heure') || p.cle.includes('minutes') ? 'text' : 'text'}
                    value={vals[p.cle] || ''}
                    onChange={(e) => setVals((v) => ({ ...v, [p.cle]: e.target.value }))}
                    style={inputS}
                  />
                )}
                <button
                  onClick={() => handleSave(p.cle)}
                  disabled={saving[p.cle]}
                  style={{
                    height: 40, padding: '0 16px', border: 'none', borderRadius: 8,
                    background: saved[p.cle] ? '#22c55e' : '#1d4ed8',
                    color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    flexShrink: 0, transition: 'background 0.3s',
                  }}
                >
                  {saved[p.cle] ? '✓ Sauvé' : saving[p.cle] ? '...' : 'Sauver'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputS = { flex: 1, height: 40, padding: '0 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 };
