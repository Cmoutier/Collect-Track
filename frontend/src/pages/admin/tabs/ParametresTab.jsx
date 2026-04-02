import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import t from '../../../styles/theme';

const PARAM_LABELS = {
  marge_defaut_minutes: 'Marge horaire par défaut (minutes)',
  alerte_email_active:  'Alertes email activées',
  alerte_email_dest:    'Destinataires des alertes email',
  alerte_hors_marge:    'Alerter pour hors marge',
  alerte_incident:      'Alerter pour incident',
  alerte_manquant:      'Alerter pour collecte manquante',
  heure_verif_manquant: 'Heure de vérification manquants (HH:MM)',
  facteur_defaut_id:    'Facteur sélectionné par défaut au scan',
  rapport_auto_actif:   'Rapport journalier automatique',
  rapport_heure:        "Heure d'envoi du rapport journalier (HH:MM)",
};

const PARAM_GROUPS = [
  {
    label: 'Horaires & conformité',
    icon: '🕐',
    keys: ['marge_defaut_minutes'],
  },
  {
    label: 'Alertes email',
    icon: '📧',
    keys: ['alerte_email_active', 'alerte_email_dest', 'alerte_hors_marge', 'alerte_incident', 'alerte_manquant', 'heure_verif_manquant'],
  },
  {
    label: 'Rapport journalier',
    icon: '📊',
    keys: ['rapport_auto_actif', 'rapport_heure'],
  },
  {
    label: 'Scan',
    icon: '📷',
    keys: ['facteur_defaut_id'],
  },
];

const BOOL_PARAMS = ['alerte_email_active', 'alerte_hors_marge', 'alerte_incident', 'alerte_manquant', 'rapport_auto_actif'];

export default function ParametresTab() {
  const [params,    setParams]    = useState([]);
  const [facteurs,  setFacteurs]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState({});
  const [vals,      setVals]      = useState({});
  const [saved,     setSaved]     = useState({});
  const [testEmail, setTestEmail] = useState({ loading: false, result: null });

  useEffect(() => {
    Promise.all([api.get('/admin/parametres'), api.get('/admin/users')]).then(([p, u]) => {
      setParams(p.data);
      const v = {};
      p.data.forEach((x) => { v[x.cle] = x.valeur; });
      setVals(v);
      setFacteurs(u.data.filter((u) => u.role === 'facteur' && u.actif));
    }).finally(() => setLoading(false));
  }, []);

  const handleTestEmail = async () => {
    setTestEmail({ loading: true, result: null });
    try {
      await api.post('/admin/test-email', {}, { timeout: 20000 });
      setTestEmail({ loading: false, result: 'ok' });
    } catch (e) {
      const msg = e.code === 'ECONNABORTED' ? 'Délai dépassé — vérifiez la config SMTP' : e.response?.data?.error || 'Erreur envoi';
      setTestEmail({ loading: false, result: msg });
    }
    setTimeout(() => setTestEmail({ loading: false, result: null }), 6000);
  };

  const handleSave = async (cle) => {
    setSaving((s) => ({ ...s, [cle]: true }));
    try {
      await api.put(`/admin/parametres/${cle}`, { valeur: vals[cle] });
      setSaved((s) => ({ ...s, [cle]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [cle]: false })), 2000);
    } catch {}
    finally { setSaving((s) => ({ ...s, [cle]: false })); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 32, color: t.textMuted }}>Chargement…</div>;

  const paramMap = Object.fromEntries(params.map((p) => [p.cle, p]));

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, marginBottom: 16 }}>Paramètres système</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {PARAM_GROUPS.map((group) => (
          <div key={group.label} style={{
            background: '#fff', borderRadius: t.radiusLg,
            boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
            overflow: 'hidden',
          }}>
            {/* En-tête groupe */}
            <div style={{
              padding: '12px 16px',
              background: t.primaryBg,
              borderBottom: `1px solid ${t.primaryBorder}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{group.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: t.primary }}>{group.label}</span>
            </div>

            {/* Paramètres du groupe */}
            <div style={{ padding: '4px 0' }}>
              {group.keys.map((cle, idx) => {
                const p = paramMap[cle];
                if (!p) return null;
                const isBool = BOOL_PARAMS.includes(cle);
                const isLast = idx === group.keys.length - 1;
                return (
                  <div key={cle} style={{
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : `1px solid ${t.borderLight}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: t.textPrimary, marginBottom: 2 }}>
                      {PARAM_LABELS[cle] || cle}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>{p.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {isBool ? (
                        <select
                          value={vals[cle] || 'false'}
                          onChange={(e) => setVals((v) => ({ ...v, [cle]: e.target.value }))}
                          style={inputS}
                        >
                          <option value="true">Oui</option>
                          <option value="false">Non</option>
                        </select>
                      ) : cle === 'facteur_defaut_id' ? (
                        <select
                          value={vals[cle] || ''}
                          onChange={(e) => setVals((v) => ({ ...v, [cle]: e.target.value }))}
                          style={inputS}
                        >
                          <option value="">— Aucun facteur par défaut —</option>
                          {facteurs.map((f) => (
                            <option key={f.id} value={String(f.id)}>
                              {f.prenom} {f.nom}
                            </option>
                          ))}
                        </select>
                      ) : cle === 'alerte_email_dest' ? (
                        <>
                          <input
                            type="text"
                            value={vals[cle] || ''}
                            onChange={(e) => setVals((v) => ({ ...v, [cle]: e.target.value }))}
                            placeholder="chef@laposte.fr, manager@laposte.fr"
                            style={inputS}
                          />
                          <button
                            onClick={handleTestEmail}
                            disabled={testEmail.loading}
                            title="Envoyer un email de test aux destinataires configurés"
                            style={{
                              height: 38, padding: '0 14px',
                              border: `1.5px solid ${t.secondary}`,
                              borderRadius: t.radiusMd,
                              background: testEmail.result === 'ok' ? t.success : testEmail.result ? t.danger : '#fff',
                              color: testEmail.result ? '#fff' : t.secondary,
                              fontWeight: 700, fontSize: 13,
                              cursor: 'pointer', flexShrink: 0,
                              transition: 'background 0.3s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {testEmail.loading ? '…' : testEmail.result === 'ok' ? '✓ Envoyé' : testEmail.result ? '✗ Échec' : 'Tester'}
                          </button>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={vals[cle] || ''}
                          onChange={(e) => setVals((v) => ({ ...v, [cle]: e.target.value }))}
                          style={inputS}
                        />
                      )}
                      <button
                        onClick={() => handleSave(cle)}
                        disabled={saving[cle]}
                        style={{
                          height: 38, padding: '0 16px',
                          border: 'none', borderRadius: t.radiusMd,
                          background: saved[cle] ? t.success : t.primary,
                          color: '#fff', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', flexShrink: 0,
                          transition: 'background 0.3s',
                          minWidth: 80,
                        }}
                      >
                        {saved[cle] ? '✓ Sauvé' : saving[cle] ? '…' : 'Sauver'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputS = {
  flex: 1, height: 38, padding: '0 12px',
  border: `1.5px solid ${t.border}`,
  borderRadius: t.radiusMd, fontSize: 14,
  color: t.textPrimary, outline: 'none',
  boxSizing: 'border-box',
};
