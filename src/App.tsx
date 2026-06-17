import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { StaffsPage } from './pages/StaffsPage';
import { TrainingsPage } from './pages/TrainingsPage';
import { TrainingFormPage } from './pages/TrainingFormPage';
import { StaffFormPage } from './pages/StaffFormPage';
import { InventoryPage } from './pages/InventoryPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AllocationPage } from './pages/AllocationPage';
import { KanbanPage } from './pages/KanbanPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { ConsultantAllocationPage } from './pages/ConsultantAllocationPage';
import { FinancePage } from './pages/FinancePage';
import { StaffPaymentReport } from './pages/StaffPaymentReport';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { StaffPortalPage } from './pages/StaffPortalPage';
import { AcessosPage } from './pages/AcessosPage';
import { usePagePermission } from './lib/permissions';

// Tipagem simples para o usuário
interface User {
  id: string;
  nome: string;
  nivel: string;
  permissions: string[];
}

// Helper para redirecionar Home
const HomeOrPortal = ({ user }: { user?: User }) => {
  const { canRead, loading } = usePagePermission('home', user);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (user?.nivel === 'admin' || canRead) {
    return <HomePage user={user} />;
  }
  return <Navigate to="/meu-portal" replace />;
};

// Componente para rotas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Tenta obter o usuário do LocalStorage como fallback imediato
        const savedUser = localStorage.getItem('nb_auth');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        
        if (savedUser) {
          headers['x-auth-user'] = savedUser;
        }

        const response = await fetch('/api/check-session-node', { 
          headers,
          credentials: 'include' 
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem('nb_auth', JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem('nb_auth');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return React.cloneElement(children, { user });
};

// Componente Placeholder para rotas em migração
const PlaceholderPage = ({ title, user }: { title: string, user?: User }) => (
  <AppLayout user={user}>
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-slate-500 mt-2 italic">Esta página está sendo migrada para o novo sistema.</p>
    </div>
  </AppLayout>
);

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            {/* If user is not admin and goes to /, they will be redirected to /meu-portal (dealt with inside ProtectedRoute or wrapping component) */}
            <HomeOrPortal />
          </ProtectedRoute>
        } />

        <Route path="/meu-portal" element={
          <ProtectedRoute>
            <StaffPortalPage />
          </ProtectedRoute>
        } />

        <Route path="/staffs" element={
          <ProtectedRoute>
            <StaffsPage />
          </ProtectedRoute>
        } />

        <Route path="/staffs/novo" element={
          <ProtectedRoute>
            <StaffFormPage />
          </ProtectedRoute>
        } />

        <Route path="/staffs/editar/:id" element={
          <ProtectedRoute>
            <StaffFormPage />
          </ProtectedRoute>
        } />

        <Route path="/treinamentos" element={
          <ProtectedRoute>
            <TrainingsPage />
          </ProtectedRoute>
        } />

        <Route path="/treinamentos/novo" element={
          <ProtectedRoute>
            <TrainingFormPage />
          </ProtectedRoute>
        } />

        <Route path="/treinamentos/editar/:id" element={
          <ProtectedRoute>
            <TrainingFormPage />
          </ProtectedRoute>
        } />

        <Route path="/estoque" element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        } />

        <Route path="/alocacao" element={
          <ProtectedRoute>
            <AllocationPage />
          </ProtectedRoute>
        } />

        <Route path="/alocacao-consultores" element={
          <ProtectedRoute>
            <ConsultantAllocationPage />
          </ProtectedRoute>
        } />

        <Route path="/checklist" element={
          <ProtectedRoute>
            <ChecklistPage />
          </ProtectedRoute>
        } />

        <Route path="/kanban" element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        } />

        <Route path="/financeiro" element={
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        } />

        <Route path="/financeiro/pagamentos" element={
          <ProtectedRoute>
            <StaffPaymentReport />
          </ProtectedRoute>
        } />

        <Route path="/configuracoes" element={
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        } />

        <Route path="/acessos" element={
          <ProtectedRoute>
            <AcessosPage />
          </ProtectedRoute>
        } />
        
        {/* Fallback para qualquer rota não definida que redireciona para a home ou login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
