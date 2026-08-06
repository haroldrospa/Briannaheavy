import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, Suspense } from 'react';
import PageTransition from '../components/PageTransition';
import { getActiveRole, isRouteAllowed } from '../utils/rolePermissions';

// Lazy load the modal since it contains two very large forms
const NewRequestModal = React.lazy(() => import('../components/forms/NewRequestModal'));

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPos = location.pathname === '/pos';
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeRole = getActiveRole();

  useEffect(() => {
    if (!isRouteAllowed(location.pathname, activeRole)) {
      if (activeRole === 'Repuestos') {
        navigate('/pos', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, activeRole, navigate]);

  return (
    <div className="h-screen w-screen bg-[#f4f3f1] dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 flex overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white transition-colors duration-300">
      {!isPos && (
        <div className="print:hidden h-full z-20 shrink-0">
          <Sidebar 
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            onNewRequest={() => setIsNewRequestModalOpen(true)} 
          />
        </div>
      )}
      
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isNewRequestModalOpen ? 'print:hidden' : ''}`}>
        {!isPos && (
          <Header onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)} />
        )}
        <main className={`flex-1 relative overflow-y-auto focus:outline-none print:overflow-visible ${isPos ? '' : 'p-3 sm:p-6 w-full'} print:p-0`}>
          <div className={isPos ? 'h-full' : 'max-w-[1600px] mx-auto h-full'}>
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
          onClose={() => setIsNewRequestModalOpen(false)} 
        />
      </Suspense>
    </div>
  );
}
