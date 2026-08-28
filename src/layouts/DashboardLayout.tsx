import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import PageTransition from '../components/PageTransition';
import { getActiveRole, isRouteAllowed } from '../utils/rolePermissions';
import { isSystemUnlocked } from '../utils/scheduleStorage';
import SystemLockScreen from '../components/SystemLockScreen';

// Lazy load the modal since it contains two very large forms
const NewRequestModal = React.lazy(() => import('../components/forms/NewRequestModal'));

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // Memoized — doesn't recompute on every state change
  const isPos = useMemo(() => location.pathname === '/pos', [location.pathname]);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [activeRole, setActiveRoleState] = useState(getActiveRole);
  const [isUnlocked, setIsUnlocked] = useState(() => isSystemUnlocked(getActiveRole()));

  useEffect(() => {
    const handleUpdate = () => {
      const currentRole = getActiveRole();
      setActiveRoleState(currentRole);
      setIsUnlocked(isSystemUnlocked(currentRole));
    };

    window.addEventListener('brianna_role_updated', handleUpdate);
    window.addEventListener('brianna_schedule_updated', handleUpdate);
    window.addEventListener('brianna_permissions_updated', handleUpdate);

    const interval = setInterval(handleUpdate, 30000);

    return () => {
      window.removeEventListener('brianna_role_updated', handleUpdate);
      window.removeEventListener('brianna_schedule_updated', handleUpdate);
      window.removeEventListener('brianna_permissions_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isRouteAllowed(location.pathname, activeRole)) {
      if (activeRole === 'Repuestos') {
        navigate('/pos', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, activeRole, navigate]);

  const handleToggleSidebar = useCallback(() => setIsMobileSidebarOpen(prev => !prev), []);
  const handleCloseSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const handleOpenNewRequest = useCallback(() => setIsNewRequestModalOpen(true), []);
  const handleCloseNewRequest = useCallback(() => setIsNewRequestModalOpen(false), []);


  return (
    <div className="h-[100dvh] w-full max-w-full bg-[#f4f3f1] dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 flex overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white transition-colors duration-300 relative">
      {!isUnlocked && <SystemLockScreen onUnlock={() => setIsUnlocked(true)} />}

      {!isPos && (
        <div className="print:hidden h-full z-20 shrink-0">
          <Sidebar 
            isOpen={isMobileSidebarOpen}
            onClose={handleCloseSidebar}
            onNewRequest={handleOpenNewRequest}
          />
        </div>
      )}
      
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${isNewRequestModalOpen ? 'print:hidden' : ''}`}>
        {!isPos && (
          <Header onToggleSidebar={handleToggleSidebar} />
        )}
        <main className={`flex-1 relative overflow-y-auto overflow-x-hidden focus:outline-none print:overflow-visible ${isPos ? '' : 'p-3 sm:p-5 md:p-6 w-full'} print:p-0`}>
          <div className={isPos ? 'h-full' : 'max-w-[1600px] mx-auto'}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <NewRequestModal 
          isOpen={isNewRequestModalOpen} 
          onClose={handleCloseNewRequest}
        />
      </Suspense>
    </div>
  );
}
