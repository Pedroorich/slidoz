import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import GeneratorPage from './pages/GeneratorPage';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Expired from './pages/Expired';
import SalesPage from './pages/SalesPage';
import CheckoutPage from './pages/CheckoutPage';
import AffiliateDashboard from './pages/AffiliateDashboard';

// Rota protegida: Exige login e assinatura ativa (ou cargo admin)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSubscriptionActive, isAdmin, profile } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin sempre tem acesso completo
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se o usuário for afiliado mas a assinatura dele expirou, manda ele para a página de afiliados
  if (profile?.isAffiliate) {
    return <Navigate to="/afiliados" replace />;
  }

  if (!isSubscriptionActive) {
    return <Navigate to="/expired" replace />;
  }

  return <>{children}</>;
}

// Rota de Administrador: Exige login e cargo admin
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Rota autenticada básica: Apenas exige que o usuário esteja logado
function AuthenticatedOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rota pública de Vendas (Landing Page) */}
        <Route path="/vendas" element={<SalesPage />} />

        {/* Rota pública de Checkout */}
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Rota do Dashboard de Afiliados */}
        <Route 
          path="/afiliados" 
          element={
            <AuthenticatedOnlyRoute>
              <AffiliateDashboard />
            </AuthenticatedOnlyRoute>
          } 
        />

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
