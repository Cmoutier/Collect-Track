import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function PrivateRoute({ children, roles }) {
  const { user, token, fetchMe } = useAuthStore();
  const [checking, setChecking] = useState(!user && !!token);

  useEffect(() => {
    if (!user && token) {
      fetchMe().finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1d4ed8' }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Chargement...</div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
