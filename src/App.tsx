import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { initRealtimeSync } from './services/realtimeService';

// Función para reintentar la carga de chunks perezosos si hubo un nuevo despliegue
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    const pageHasBeenRefreshed = sessionStorage.getItem('chunk_retry_refreshed');
    try {
      return await componentImport();
    } catch (error: any) {
      console.warn('Error al cargar módulo dinámico (posible nueva versión desplegada en el servidor):', error);
      if (!pageHasBeenRefreshed) {
        sessionStorage.setItem('chunk_retry_refreshed', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

// Páginas Lazy Loaded con Auto-Recuperación
const Login = lazyWithRetry(() => import('./pages/Login'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const POS = lazyWithRetry(() => import('./pages/POS'));
const Cobros = lazyWithRetry(() => import('./pages/Cobros'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Financing = lazyWithRetry(() => import('./pages/Financing'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Customers = lazyWithRetry(() => import('./pages/Customers'));
const Invoices = lazyWithRetry(() => import('./pages/Invoices'));
const Banks = lazyWithRetry(() => import('./pages/Banks'));
const Catalog = lazyWithRetry(() => import('./pages/Catalog'));

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
  useEffect(() => {
    // Si la app cargó con éxito, limpiar flags de reintentos
    setTimeout(() => {
      sessionStorage.removeItem('chunk_retry_refreshed');
      sessionStorage.removeItem('global_chunk_reload');
      sessionStorage.removeItem('eb_chunk_reload_attempted');
    }, 1500);

    const cleanup = initRealtimeSync();
    return () => cleanup();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Rutas Públicas */}
                <Route path="/tienda" element={<Catalog isPublic={true} />} />
                <Route path="/catalogo-publico" element={<Navigate to="/tienda" replace />} />
                <Route path="/store" element={<Navigate to="/tienda" replace />} />
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                {/* Rutas Protegidas */}
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clientes" element={<Customers />} />
                  <Route path="/facturas" element={<Invoices />} />
                  <Route path="/usuarios" element={<Navigate to="/configuracion?tab=usuarios" replace />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/cobros" element={<Cobros />} />
                  <Route path="/inventario" element={<Inventory />} />
                  <Route path="/catalogo" element={<Catalog />} />
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
                  <Route path="/catalog" element={<Navigate to="/catalogo" replace />} />
                  <Route path="/customers" element={<Navigate to="/clientes" replace />} />
                  <Route path="/invoices" element={<Navigate to="/facturas" replace />} />
                  <Route path="/users" element={<Navigate to="/configuracion?tab=usuarios" replace />} />
                  <Route path="/permisos" element={<Navigate to="/configuracion?tab=permisos" replace />} />
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
