import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

// Páginas Lazy Loaded
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const POS = React.lazy(() => import('./pages/POS'));
const Cobros = React.lazy(() => import('./pages/Cobros'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Financing = React.lazy(() => import('./pages/Financing'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Banks = React.lazy(() => import('./pages/Banks'));

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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
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
                  <Route path="/facturas" element={<Invoices />} />
                  <Route path="/usuarios" element={<Navigate to="/configuracion" replace />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/cobros" element={<Cobros />} />
                  <Route path="/inventario" element={<Inventory />} />
                  <Route path="/financiamientos" element={<Financing />} />
                  <Route path="/bancos" element={<Banks />} />
                  <Route path="/reportes" element={<Reports />} />
                  <Route path="/configuracion" element={<Settings />} />

                  {/* Alias en Inglés & Catch-all Fallback */}
                  <Route path="/banco" element={<Navigate to="/bancos" replace />} />
                  <Route path="/banks" element={<Navigate to="/bancos" replace />} />
                  <Route path="/receivables" element={<Navigate to="/cobros" replace />} />
                  <Route path="/finanzas" element={<Navigate to="/financiamientos" replace />} />
                  <Route path="/inventory" element={<Navigate to="/inventario" replace />} />
                  <Route path="/customers" element={<Navigate to="/clientes" replace />} />
                  <Route path="/invoices" element={<Navigate to="/facturas" replace />} />
                  <Route path="/users" element={<Navigate to="/configuracion" replace />} />
                  <Route path="/financing" element={<Navigate to="/financiamientos" replace />} />
                  <Route path="/reports" element={<Navigate to="/reportes" replace />} />
                  <Route path="/settings" element={<Navigate to="/configuracion" replace />} />
                  <Route path="*" element={<Navigate to="/inventario" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
