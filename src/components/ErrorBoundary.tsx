import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const message = (error?.message || '').toLowerCase();
    const isChunk = 
      message.includes('dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('preloaderror') ||
      message.includes('failed to fetch') ||
      message.includes('importing a module script failed');

    return {
      hasError: true,
      error,
      isChunkError: isChunk
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);

    const message = (error?.message || '').toLowerCase();
    const isChunk = 
      message.includes('dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('preloaderror') ||
      message.includes('failed to fetch') ||
      message.includes('importing a module script failed');

    if (isChunk) {
      const hasAutoReloaded = sessionStorage.getItem('eb_chunk_reload_attempted');
      if (!hasAutoReloaded) {
        sessionStorage.setItem('eb_chunk_reload_attempted', 'true');
        console.warn('Recargando automáticamente para descargar la nueva versión de los archivos...');
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('eb_chunk_reload_attempted');
    window.location.reload();
  };

  private handleHardReset = async () => {
    try {
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('Error al limpiar cachés:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                {this.state.isChunkError ? 'Nueva Versión Disponible' : 'Ha Ocurrido un Inconveniente'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                {this.state.isChunkError 
                  ? 'El sistema se ha actualizado en el servidor con nuevas mejoras. Se requiere actualizar la pantalla para cargar los módulos más recientes.'
                  : 'Ocurrió un error temporal al cargar la vista. Puedes recargar la aplicación para continuar.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#ED1C24] hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <ArrowPathIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Recargar y Actualizar Sistema</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-2xl font-bold text-xs transition-all cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Limpiar Caché y Reiniciar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
