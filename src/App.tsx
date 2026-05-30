import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import GeneratorPage from './pages/GeneratorPage';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Expired from './pages/Expired';

// Rota protegida: Exige login e assinatura ativa (ou cargo admin)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSubscriptionActive, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin sempre tem acesso completo
  if (isAdmin) {
    return <>{children}</>;
  }

  if (!isSubscriptionActive) {
    return <Navigate to="/expired" replace />;
  }

  return <>{children}</>;
}

// Rota de Administrador: Exige login e cargo admin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Rota autenticada básica: Apenas exige que o usuário esteja logado
function AuthenticatedOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rota pública de Login */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas por Assinatura Ativa */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/gerador" 
          element={
            <ProtectedRoute>
              <GeneratorPage />
            </ProtectedRoute>
          } 
        />

        {/* Rota de Assinatura Expirada */}
        <Route 
          path="/expired" 
          element={
            <AuthenticatedOnlyRoute>
              <Expired />
            </AuthenticatedOnlyRoute>
          } 
        />

        {/* Rota do Painel do Administrador */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  );
}
