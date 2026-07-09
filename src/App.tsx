import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy loaded pages
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const POS = React.lazy(() => import('./pages/POS'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Financing = React.lazy(() => import('./pages/Financing'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Users = React.lazy(() => import('./pages/Users'));

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Rutas Públicas */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Rutas Protegidas */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/inventario" element={<Inventory />} />
              <Route path="/financiamientos" element={<Financing />} />
              <Route path="/reportes" element={<Reports />} />
              <Route path="/configuracion" element={<Settings />} />
              {/* TODO: Add other routes here */}
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
