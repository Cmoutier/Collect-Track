import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';

const JOURS_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const emptyClient = {
  nom: '', adresse: '', codePostal: '', ville: '',
  joursCollecte: [1, 2, 3, 4, 5],
  heureDebut: '08:00', heureFin: '12:00', margeMinutes: 15,
  facteurDefautId: '', notes: '', actif: true,
};

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [facteurs, setFacteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([api.get('/admin/clients'), api.get('/admin/users')])
      .then(([c, u]) => {
        setClients(c.data);
        setFacteurs(u.data.filter((u) => u.role === 'facteur' && u.actif));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setForm({ ...emptyClient }); setIsEdit(false); setError(''); };
  const openEdit = (c) => {
    setForm({ ...c, facteurDefautId: c.facteurDefautId ? String(c.facteurDefautId) : '', password: '' });
    setIsEdit(true); setError('');
  };
  const closeForm = () => { setForm(null); setError(''); };

  const toggleJour = (j) => {
    setForm((f) => ({
      ...f,
      joursCollecte: f.joursCollecte.includes(j)
        ? f.joursCollecte.filter((x) => x !== j)
        : [...f.joursCollecte, j].sort(),
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.nom || !form.adresse || !form.codePostal || !form.ville || !form.heureDebut || !form.heureFin) {
      return setError('Champs obligatoires manquants');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        facteurDefautId: form.facteurDefautId || null,
        margeMinutes: parseInt(form.margeMinutes),
      };
      if (isEdit) await api.put(`/admin/clients/${form.id}`, payload);
      else await api.post('/admin/clients', payload);
      closeForm();
      fetchAll();
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c) => {
    await api.put(`/admin/clients/${c.id}`, { actif: !c.actif });
    fetchAll();
  };

  const downloadQR = (c) => {
    const link = document.createElement('a');
    link.href = `/api/admin/clients/${c.id}/qrcode`;
    link.download = `qr-${c.nom}.png`;
    link.click();
  };

  const filtered = clients.filter((c) =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.ville.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 700, color: '#1e293b' }}>Clients ({clients.length})</h2>
        <button onClick={openCreate} style={btnPrimary}>+ Ajouter</button>
      </div>

      <input
        type="text" placeholder="Rechercher..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputS, marginBottom: 12 }}
      />

      {loading ? <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Chargement...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{
              background: '#fff', borderRadius: 10, padding: 14,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              opacity: c.actif ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.nom}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{c.adresse}, {c.codePostal} {c.ville}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {c.heureDebut} – {c.heureFin} · marge {c.margeMinutes}min
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {c.joursCollecte.map((j) => JOURS_LABELS[j]).join(', ')}
                  </div>
                  {c.facteurDefaut && (
                    <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2 }}>
                      Facteur : {c.facteurDefaut.prenom} {c.facteurDefaut.nom}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                  <button onClick={() => openEdit(c)} style={btnSecondary}>Éditer</button>
                  <button onClick={() => downloadQR(c)} style={btnSecondary}>QR Code</button>
                  <button onClick={() => handleToggle(c)} style={{ ...btnSecondary, color: c.actif ? '#ef4444' : '#22c55e' }}>
                    {c.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
            <Field label="Code postal *"><input style={inputS} value={form.codePostal} onChange={(e) => setForm((f) => ({ ...f, codePostal: e.target.value }))} /></Field>
            <Field label="Ville *"><input style={inputS} value={form.ville} onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))} /></Field>
          </div>

          <Field label="Jours de collecte">
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <button key={j} type="button" onClick={() => toggleJour(j)} style={{
                  width: 36, height: 36, border: '2px solid',
                  borderColor: form.joursCollecte.includes(j) ? '#1d4ed8' : '#e2e8f0',
                  borderRadius: 6, background: form.joursCollecte.includes(j) ? '#1d4ed8' : '#fff',
                  color: form.joursCollecte.includes(j) ? '#fff' : '#94a3b8',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>
                  {JOURS_LABELS[j]}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Field label="Début *"><input type="time" style={inputS} value={form.heureDebut} onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))} /></Field>
            <Field label="Fin *"><input type="time" style={inputS} value={form.heureFin} onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))} /></Field>
            <Field label="Marge (min)"><input type="number" style={inputS} min="0" max="120" value={form.margeMinutes} onChange={(e) => setForm((f) => ({ ...f, margeMinutes: e.target.value }))} /></Field>
          </div>

          <Field label="Facteur par défaut">
            <select style={inputS} value={form.facteurDefautId} onChange={(e) => setForm((f) => ({ ...f, facteurDefautId: e.target.value }))}>
              <option value="">-- Aucun --</option>
              {facteurs.map((f) => <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea style={{ ...inputS, height: 'auto', padding: '8px 10px' }} rows={2} value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={closeForm} style={{ ...btnSecondary, flex: 1, height: 44 }}>Annuler</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 2, height: 44 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const btnPrimary = { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' };
const inputS = { width: '100%', height: 40, padding: '0 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 };
const errorBox = { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 };
