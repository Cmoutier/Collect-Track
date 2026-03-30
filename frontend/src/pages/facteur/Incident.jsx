import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';

export default function IncidentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Marquer incident
      await api.put(`/collectes/${id}/incident`, { notes });

      // Upload photos si présentes
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((p) => formData.append('photos', p));
        await api.post(`/collectes/${id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setSuccess(true);
      setTimeout(() => navigate('/scan'), 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <Layout title="Incident signalé">
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#166534', fontWeight: 700 }}>Incident enregistré</h2>
        <p style={{ color: '#64748b', marginTop: 8 }}>Redirection vers le scan...</p>
      </div>
    </Layout>
  );

  return (
    <Layout title="Signaler un incident">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{
          background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12,
          padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: '#991b1b' }}>Collecte #{id}</div>
            <div style={{ fontSize: 13, color: '#b91c1c' }}>Renseignez les détails de l'incident</div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Notes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <label style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Description de l'incident *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: '100%', padding: 12, border: '2px solid #e2e8f0', borderRadius: 8,
              fontSize: 15, resize: 'vertical', fontFamily: 'inherit',
            }}
            placeholder="Décrivez l'incident (boîte absente, accès impossible, etc.)"
          />
        </div>

        {/* Photos */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <label style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Photos (optionnel, max 5)
          </label>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current.click()}
            style={{
              width: '100%', height: 48, background: '#f8fafc', border: '2px dashed #cbd5e1',
              borderRadius: 8, fontSize: 15, color: '#475569', cursor: 'pointer',
            }}
          >
            📸 Ajouter des photos
          </button>

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0' }} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1, height: 52, background: '#f1f5f9', color: '#475569',
              border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !notes.trim()}
            style={{
              flex: 2, height: 52,
              background: loading || !notes.trim() ? '#fca5a5' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: loading || !notes.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Enregistrement...' : '🚨 Confirmer l\'incident'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
