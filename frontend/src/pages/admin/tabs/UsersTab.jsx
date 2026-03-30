import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import t from '../../../styles/theme';

const ROLES = ['facteur', 'manager', 'admin'];
const ROLE_COLOR = { admin: t.danger, manager: t.secondary, facteur: t.primary };
const emptyUser = { nom: '', prenom: '', email: '', password: '', role: 'facteur', actif: true };

export default function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(null);
  const [isEdit,  setIsEdit]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.get('/admin/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setForm({ ...emptyUser }); setIsEdit(false); setError(''); };
  const openEdit   = (u) => { setForm({ ...u, password: '' }); setIsEdit(true); setError(''); };
  const closeForm  = () => { setForm(null); setError(''); };

  const handleSave = async () => {
    setError('');
    if (!form.nom || !form.prenom || !form.email || (!isEdit && !form.password))
      return setError('Tous les champs obligatoires doivent être remplis');
    setSaving(true);
    try {
      if (isEdit) {
        const data = { nom: form.nom, prenom: form.prenom, email: form.email, role: form.role, actif: form.actif };
        if (form.password) data.password = form.password;
        await api.put(`/admin/users/${form.id}`, data);
      } else {
        await api.post('/admin/users', form);
      }
      closeForm(); fetchUsers();
    } catch (e) { setError(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    await api.put(`/admin/users/${u.id}`, { actif: !u.actif });
    fetchUsers();
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary }}>Utilisateurs</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>{users.length} compte{users.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={openCreate} style={btnPrimary}>+ Ajouter</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: t.textMuted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} style={{
              background: '#fff', borderRadius: t.radiusLg, padding: '14px 16px',
              boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: u.actif ? 1 : 0.5,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: ROLE_COLOR[u.role] || t.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 14,
              }}>
                {u.prenom[0]}{u.nom[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>
                  {u.prenom} {u.nom}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
                <span style={{
                  display: 'inline-block', marginTop: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
                  color: ROLE_COLOR[u.role] || t.primary,
                  background: (ROLE_COLOR[u.role] || t.primary) + '18',
                  padding: '2px 8px', borderRadius: t.radiusFull,
                  textTransform: 'uppercase',
                }}>
                  {u.role}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(u)} style={btnSm}>Éditer</button>
                <button onClick={() => handleToggle(u)} style={{ ...btnSm, color: u.actif ? t.danger : t.success }}>
                  {u.actif ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} onClose={closeForm}>
          {error && <div style={errorBox}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Prénom *"><input style={inputS} value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></Field>
            <Field label="Nom *"><input style={inputS} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></Field>
          </div>
          <Field label="Email *"><input type="email" style={inputS} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label={isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}>
            <input type="password" style={inputS} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </Field>
          <Field label="Rôle">
            <select style={inputS} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          {isEdit && (
            <Field label="Statut">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
                Compte actif
              </label>
            </Field>
          )}
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
      <div style={{ background: '#fff', borderRadius: t.radiusXl, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: t.shadowLg }}>
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
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 5, letterSpacing: '0.3px' }}>{label}</label>
      {children}
    </div>
  );
}

const btnPrimary = { background: t.primary, color: '#fff', border: 'none', borderRadius: t.radiusMd, padding: '0 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', height: 38 };
const btnSm      = { background: t.bgPage, color: t.textSecondary, border: `1.5px solid ${t.border}`, borderRadius: t.radiusSm, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const inputS     = { width: '100%', height: 40, padding: '0 12px', border: `1.5px solid ${t.border}`, borderRadius: t.radiusMd, fontSize: 14, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' };
const errorBox   = { background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, color: t.danger, padding: '10px 14px', borderRadius: t.radiusMd, marginBottom: 14, fontSize: 13 };
