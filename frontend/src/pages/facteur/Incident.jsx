import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import t from '../../styles/theme';

export default function IncidentPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const fileRef   = useRef(null);

  const [notes,    setNotes]    = useState('');
  const [photos,   setPhotos]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (idx) => {
    setPhotos((p)    => p.filter((_, i) => i !== idx));
    setPreviews((p)  => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setLoading(true); setError('');
    try {
      await api.put(`/collectes/${id}/incident`, { notes });
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((p) => formData.append('photos', p));
        await api.post(`/collectes/${id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setSuccess(true);
      setTimeout(() => navigate('/scan'), 2500);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <Layout title="Incident enregistré">
      <div style={{ textAlign: 'center', padding: '48px 24px', fontFamily: t.fontFamily }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: t.successBg, border: `3px solid ${t.success}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 36,
        }}>
          ✓
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 20, color: t.success, marginBottom: 8 }}>
          Incident enregistré
        </h2>
        <p style={{ color: t.textMuted, fontSize: 14 }}>Retour vers le scanner…</p>
      </div>
    </Layout>
  );

  return (
    <Layout title="Signaler un incident">
      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: t.fontFamily }}>

        {/* ── En-tête alerte ── */}
        <div style={{
          background: t.dangerBg,
          border: `1.5px solid ${t.dangerBorder}`,
          borderRadius: t.radiusLg,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: t.danger, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, flexShrink: 0,
          }}>
            !
          </div>
          <div>
            <div style={{ fontWeight: 700, color: t.danger, fontSize: 15 }}>
              Collecte #{id}
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C' }}>
              Renseignez les détails de l'incident
            </div>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div style={{
            background: t.dangerBg, border: `1px solid ${t.dangerBorder}`,
            color: t.danger, padding: '10px 14px',
            borderRadius: t.radiusMd, marginBottom: 14, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* ── Description ── */}
        <div style={card}>
          <label style={sectionLabel}>Description de l'incident *</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: '100%', padding: '12px 14px',
              border: `1.5px solid ${notes.trim() ? t.primaryBorder : t.border}`,
              borderRadius: t.radiusMd, fontSize: 14,
              resize: 'vertical', fontFamily: t.fontFamily,
              color: t.textPrimary, outline: 'none',
              transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
            placeholder="Boîte absente, accès impossible, porte verrouillée…"
          />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, textAlign: 'right' }}>
            {notes.length} caractère{notes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Photos ── */}
        <div style={card}>
          <label style={sectionLabel}>Photos (optionnel, max 5)</label>
          <input
            type="file" ref={fileRef}
            accept="image/*" multiple capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />

          {previews.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={src} alt=""
                    style={{
                      width: 76, height: 76, objectFit: 'cover',
                      borderRadius: t.radiusMd, border: `1.5px solid ${t.border}`,
                    }}
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: t.danger, color: '#fff',
                      border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {previews.length < 5 && (
                <button
                  onClick={() => fileRef.current.click()}
                  style={{
                    width: 76, height: 76,
                    border: `2px dashed ${t.primaryBorder}`,
                    borderRadius: t.radiusMd,
                    background: t.primaryBg,
                    color: t.primary, fontSize: 22, cursor: 'pointer',
                  }}
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current.click()}
              style={{
                width: '100%', height: 56,
                border: `2px dashed ${t.border}`,
                borderRadius: t.radiusMd,
                background: '#FAFAFA',
                color: t.textMuted, fontSize: 14,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Ajouter des photos
            </button>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1, height: 52,
              background: '#fff', color: t.textSecondary,
              border: `1.5px solid ${t.border}`,
              borderRadius: t.radiusMd, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !notes.trim()}
            style={{
              flex: 2, height: 52,
              background: !notes.trim() || loading ? '#FCA5A5' : t.danger,
              color: '#fff', border: 'none',
              borderRadius: t.radiusMd, fontSize: 15, fontWeight: 700,
              cursor: !notes.trim() || loading ? 'not-allowed' : 'pointer',
              boxShadow: notes.trim() && !loading ? `0 4px 12px ${t.danger}44` : 'none',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Enregistrement…' : 'Confirmer l\'incident'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

const card = {
  background: '#fff', borderRadius: t.radiusLg,
  padding: 16, marginBottom: 14,
  boxShadow: t.shadowCard, border: `1px solid ${t.border}`,
};
const sectionLabel = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: t.textMuted, letterSpacing: '0.6px',
  textTransform: 'uppercase', marginBottom: 10,
};
