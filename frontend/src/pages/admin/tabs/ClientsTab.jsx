import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import t from '../../../styles/theme';

const JOURS_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const emptyClient = {
  nom: '', adresse: '', codePostal: '', ville: '',
  joursCollecte: [1, 2, 3, 4, 5],
  heureDebut: '08:00', heureFin: '12:00',
  margeMinutes: 15, facteurDefautId: '', notes: '', actif: true,
};

export default function ClientsTab() {
  const [clients,  setClients]  = useState([]);
  const [facteurs, setFacteurs] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(null);
  const [isEdit,   setIsEdit]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');

  const fetchAll = () => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/admin/clients'), api.get('/admin/users')])
      .then(([c, u]) => {
        setClients(c.data);
        setFacteurs(u.data.filter((u) => u.role === 'facteur' && u.actif));
      })
      .catch((e) => setError(e.response?.data?.error || 'Erreur lors du chargement des clients'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setForm({ ...emptyClient }); setIsEdit(false); setError(''); };
  const openEdit   = (c) => { setForm({ ...c, facteurDefautId: c.facteurDefautId ? String(c.facteurDefautId) : '' }); setIsEdit(true); setError(''); };
  const closeForm  = () => { setForm(null); setError(''); };

  const toggleJour = (j) => setForm((f) => ({
    ...f,
    joursCollecte: f.joursCollecte.includes(j)
      ? f.joursCollecte.filter((x) => x !== j)
      : [...f.joursCollecte, j].sort(),
  }));

  const handleSave = async () => {
    setError('');
    if (!form.nom || !form.adresse || !form.codePostal || !form.ville || !form.heureDebut || !form.heureFin)
      return setError('Champs obligatoires manquants');
    setSaving(true);
    try {
      const payload = { ...form, facteurDefautId: form.facteurDefautId || null, margeMinutes: parseInt(form.margeMinutes) };
      if (isEdit) await api.put(`/admin/clients/${form.id}`, payload);
      else        await api.post('/admin/clients', payload);
      closeForm(); fetchAll();
    } catch (e) { setError(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c) => {
    await api.put(`/admin/clients/${c.id}`, { actif: !c.actif });
    fetchAll();
  };

  const moveClient = async (index, direction) => {
    const sorted = [...filtered].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[targetIndex];
    // On échange les ordres (ou on utilise les positions si égaux)
    const ordreA = index;
    const ordreB = targetIndex;
    await Promise.all([
      api.put(`/admin/clients/${a.id}`, { ordre: ordreB }),
      api.put(`/admin/clients/${b.id}`, { ordre: ordreA }),
    ]);
    fetchAll();
  };

  const downloadQR = async (c) => {
    try {
      const response = await api.get(`/admin/clients/${c.id}/qrcode`, { responseType: 'blob' });
      const imgUrl = URL.createObjectURL(response.data);

      const img = new Image();
      img.onload = () => {
        const labelHeight = 56;
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height + labelHeight;
        const ctx = canvas.getContext('2d');

        // Fond blanc
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // QR Code
        ctx.drawImage(img, 0, 0);

        // Nom du client centré en dessous
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText(c.nom, canvas.width / 2, img.height + 36);

        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-${c.nom.replace(/\s+/g, '_')}.png`;
          link.click();
          URL.revokeObjectURL(url);
        });
        URL.revokeObjectURL(imgUrl);
      };
      img.src = imgUrl;
    } catch { alert('Erreur lors du téléchargement du QR Code'); }
  };

  const filtered = clients
    .filter((c) => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.ville.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary }}>Clients</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={openCreate} style={btnPrimary}>+ Ajouter</button>
      </div>

      <input type="text" placeholder="Rechercher par nom ou ville…" value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputS, marginBottom: 12, background: '#fff' }} />

      {error && !form && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: t.textMuted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c, index) => (
            <div key={c.id} style={{
              background: '#fff', borderRadius: t.radiusLg, padding: '14px 16px',
              boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
              opacity: c.actif ? 1 : 0.5,
              display: 'flex', gap: 10, alignItems: 'stretch',
            }}>
              {/* Boutons ordre */}
              {!search && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => moveClient(index, -1)}
                    disabled={index === 0}
                    title="Monter"
                    style={{ ...btnOrdre, opacity: index === 0 ? 0.2 : 1 }}
                  >▲</button>
                  <span style={{ fontSize: 10, color: t.textMuted, textAlign: 'center', lineHeight: 1 }}>{index + 1}</span>
                  <button
                    onClick={() => moveClient(index, 1)}
                    disabled={index === filtered.length - 1}
                    title="Descendre"
                    style={{ ...btnOrdre, opacity: index === filtered.length - 1 ? 0.2 : 1 }}
                  >▼</button>
                </div>
              )}

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{c.nom}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  {c.adresse}, {c.codePostal} {c.ville}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={pill(t.primary)}>
                    {c.heureDebut} – {c.heureFin} · ±{c.margeMinutes}min
                  </span>
                  <span style={pill(t.secondary)}>
                    {c.joursCollecte.map((j) => JOURS_LABELS[j]).join(' ')}
                  </span>
                  {c.facteurDefaut && (
                    <span style={pill(t.textMuted)}>
                      {c.facteurDefaut.prenom} {c.facteurDefaut.nom}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(c)} style={btnSm}>Éditer</button>
                <button onClick={() => downloadQR(c)} style={{ ...btnSm, color: t.secondary }}>QR Code</button>
                <button onClick={() => handleToggle(c)} style={{ ...btnSm, color: c.actif ? t.danger : t.success }}>
                  {c.actif ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {form && (
        <Modal title={isEdit ? 'Modifier le client' : 'Nouveau client'} onClose={closeForm}>
          {error && <div style={errorBox}>{error}</div>}
          <Field label="Nom *"><input style={inputS} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></Field>
          <Field label="Adresse *"><input style={inputS} value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <Field label="Code postal *"><input style={inputS} value={form.codePostal} onChange={(e) => setForm((f) => ({ ...f, codePostal: e.target.value }))} /></Field>
            <Field label="Ville *"><input style={inputS} value={form.ville} onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))} /></Field>
          </div>

          <Field label="Jours de collecte">
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5,6,7].map((j) => {
                const active = form.joursCollecte.includes(j);
                return (
                  <button key={j} type="button" onClick={() => toggleJour(j)} style={{
                    width: 34, height: 34, border: `2px solid`,
                    borderColor: active ? t.primary : t.border,
                    borderRadius: t.radiusSm,
                    background: active ? t.primary : '#fff',
                    color: active ? '#fff' : t.textMuted,
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>
                    {JOURS_LABELS[j]}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Début *"><input type="time" style={inputS} value={form.heureDebut} onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))} /></Field>
            <Field label="Fin *"><input type="time" style={inputS} value={form.heureFin} onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))} /></Field>
            <Field label="Marge (min)"><input type="number" style={inputS} min="0" max="120" value={form.margeMinutes} onChange={(e) => setForm((f) => ({ ...f, margeMinutes: e.target.value }))} /></Field>
          </div>

          <Field label="Facteur par défaut">
            <select style={inputS} value={form.facteurDefautId} onChange={(e) => setForm((f) => ({ ...f, facteurDefautId: e.target.value }))}>
              <option value="">— Aucun —</option>
              {facteurs.map((f) => <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea style={{ ...inputS, height: 'auto', padding: '8px 12px', resize: 'vertical' }} rows={2}
              value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={closeForm} style={{ ...btnSm, flex: 1, height: 44 }}>Annuler</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 2, height: 44 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: t.radiusXl, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: t.shadowLg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 17, color: t.textPrimary }}>{title}</h3>
          <button onClick={onClose} style={{ background: t.bgPage, border: 'none', width: 32, height: 32, borderRadius: t.radiusMd, cursor: 'pointer', fontSize: 18, color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const btnOrdre = { background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 10, padding: '2px 4px', lineHeight: 1 };
const pill = (color) => ({
  fontSize: 11, fontWeight: 600, color,
  background: color + '14',
  padding: '3px 8px', borderRadius: t.radiusFull,
});
const btnPrimary = { background: t.primary, color: '#fff', border: 'none', borderRadius: t.radiusMd, padding: '0 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', height: 38 };
const btnSm      = { background: t.bgPage, color: t.textSecondary, border: `1.5px solid ${t.border}`, borderRadius: t.radiusSm, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const inputS     = { width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${t.border}`, borderRadius: t.radiusMd, fontSize: 14, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' };
const errorBox   = { background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, color: t.danger, padding: '10px 14px', borderRadius: t.radiusMd, marginBottom: 14, fontSize: 13 };
