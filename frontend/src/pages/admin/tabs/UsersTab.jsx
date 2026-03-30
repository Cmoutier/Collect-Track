import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';

const ROLES = ['facteur', 'manager', 'admin'];
const emptyUser = { nom: '', prenom: '', email: '', password: '', role: 'facteur', actif: true };

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = fermé, {} = création/édition
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.get('/admin/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setForm({ ...emptyUser }); setIsEdit(false); setError(''); };
  const openEdit = (u) => { setForm({ ...u, password: '' }); setIsEdit(true); setError(''); };
  const closeForm = () => { setForm(null); setError(''); };

  const handleSave = async () => {
    setError('');
    if (!form.nom || !form.prenom || !form.email || (!isEdit && !form.password)) {
      return setError('Tous les champs obligatoires doivent être remplis');
    }
    setSaving(true);
    try {
      if (isEdit) {
        const data = { nom: form.nom, prenom: form.prenom, email: form.email, role: form.role, actif: form.actif };
        if (form.password) data.password = form.password;
        await api.put(`/admin/users/${form.id}`, data);
      } else {
        await api.post('/admin/users', form);
      }
      closeForm();
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u) => {
    await api.put(`/admin/users/${u.id}`, { actif: !u.actif });
    fetchUsers();
  };

  const roleColor = { admin: '#7c3aed', manager: '#1d4ed8', facteur: '#0891b2' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 700, color: '#1e293b' }}>Utilisateurs ({users.length})</h2>
        <button onClick={openCreate} style={btnPrimary}>+ Ajouter</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Chargement...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} style={{
              background: '#fff', borderRadius: 10, padding: 14,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: u.actif ? 1 : 0.55,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: roleColor[u.role] || '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 15,
              }}>
                {u.prenom[0]}{u.nom[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.prenom} {u.nom}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{u.email}</div>
                <span style={{
                  display: 'inline-block', marginTop: 2, fontSize: 11, fontWeight: 700,
                  background: roleColor[u.role] + '22', color: roleColor[u.role],
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {u.role}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(u)} style={btnSecondary}>Éditer</button>
                <button onClick={() => handleToggle(u)} style={{
                  ...btnSecondary, color: u.actif ? '#ef4444' : '#22c55e',
                }}>
                  {u.actif ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {form && (
        <Modal title={isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} onClose={closeForm}>
          {error && <div style={errorBox}>{error}</div>}
          <Field label="Prénom *"><input style={inputS} value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></Field>
          <Field label="Nom *"><input style={inputS} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></Field>
          <Field label="Email *"><input type="email" style={inputS} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label={isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}>
            <input type="password" style={inputS} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </Field>
          <Field label="Rôle">
            <select style={inputS} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          {isEdit && (
            <Field label="Statut">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
                Actif
              </label>
            </Field>
          )}
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
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
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
const btnSecondary = { background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' };
const inputS = { width: '100%', height: 40, padding: '0 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 };
const errorBox = { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 };
