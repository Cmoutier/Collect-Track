import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import t from '../styles/theme';
import logoStepPost from '../assets/Logo vert - STEP POST - RVB.jpg';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, loading, user, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && token) navigate(user.role === 'facteur' ? '/scan' : '/dashboard');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: t.fontFamily,
      background: t.bgPage,
    }}>
      {/* Bande supérieure verte */}
      <div style={{
        background: t.primary,
        height: 6,
        width: '100%',
      }} />

      {/* Contenu centré */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo / en-tête */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <img
              src={logoStepPost}
              alt="STEP POST"
              style={{ height: 72, marginBottom: 16, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 800, fontSize: 22, color: t.textPrimary, letterSpacing: '-0.3px' }}>
              STEP POST
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              Collect&amp;Track — Traçabilité des collectes
            </div>
          </div>

          {/* Carte formulaire */}
          <div style={{
            background: '#fff',
            borderRadius: t.radiusXl,
            padding: 28,
            boxShadow: t.shadowLg,
            border: `1px solid ${t.border}`,
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary, marginBottom: 20 }}>
              Connexion
            </h2>

            {error && (
              <div style={{
                background: t.dangerBg,
                border: `1px solid ${t.dangerBorder}`,
                color: t.danger,
                padding: '10px 14px',
                borderRadius: t.radiusMd,
                marginBottom: 16,
                fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@steppost.fr"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = t.primary}
                  onBlur={(e)  => e.target.style.borderColor = t.border}
                />
              </div>

              {/* Mot de passe */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={(e) => e.target.style.borderColor = t.primary}
                    onBlur={(e)  => e.target.style.borderColor = t.border}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: t.textMuted, fontSize: 16, padding: 4,
                    }}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 52,
                  background: loading ? t.primaryLight : t.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: t.radiusMd,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'background 0.2s, transform 0.1s',
                  boxShadow: loading ? 'none' : `0 4px 14px ${t.primary}55`,
                }}
                onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {loading ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: t.textMuted }}>
            STEP POST · Collect&amp;Track
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};
const inputStyle = {
  width: '100%', height: 46, padding: '0 14px',
  border: `1.5px solid #D6E4DA`,
  borderRadius: '8px', fontSize: 14,
  outline: 'none', transition: 'border-color 0.2s',
  boxSizing: 'border-box', background: '#fff',
};
