import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Auto-recuperación ante despliegues de nuevas versiones (Vite chunk load failure)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error: nueva versión detectada en el servidor. Recargando página...');
  event.preventDefault();
  window.location.reload();
});

window.addEventListener('error', (event) => {
  const msg = (event?.message || '').toLowerCase();
  if (
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically') ||
    msg.includes('importing a module script failed')
  ) {
    const hasReloaded = sessionStorage.getItem('global_chunk_reload');
    if (!hasReloaded) {
      sessionStorage.setItem('global_chunk_reload', 'true');
      console.warn('Error de carga de chunk detectado. Forzando recarga...');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

