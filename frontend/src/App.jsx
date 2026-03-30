import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import ScanPage from './pages/facteur/Scan';
import TourneePage from './pages/facteur/Tournee';
import IncidentPage from './pages/facteur/Incident';
import DashboardPage from './pages/manager/Dashboard';
import HistoriquePage from './pages/manager/Historique';
import AdminPage from './pages/admin/Admin';

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Facteur */}
        <Route path="/scan" element={
          <PrivateRoute roles={['facteur', 'admin', 'manager']}>
            <ScanPage />
          </PrivateRoute>
        } />
        <Route path="/tournee" element={
          <PrivateRoute roles={['facteur', 'admin', 'manager']}>
            <TourneePage />
          </PrivateRoute>
        } />
        <Route path="/incident/:id" element={
          <PrivateRoute roles={['facteur', 'admin', 'manager']}>
            <IncidentPage />
          </PrivateRoute>
        } />

        {/* Manager / Admin */}
        <Route path="/dashboard" element={
          <PrivateRoute roles={['manager', 'admin']}>
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="/historique" element={
          <PrivateRoute roles={['manager', 'admin']}>
            <HistoriquePage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}>
            <AdminPage />
          </PrivateRoute>
        } />

        {/* Redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <div style={{ padding: 20 }}>Chargement...</div>;
  if (user.role === 'facteur') return <Navigate to="/scan" replace />;
  if (user.role === 'manager') return <Navigate to="/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
