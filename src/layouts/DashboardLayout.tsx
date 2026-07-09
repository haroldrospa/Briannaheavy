import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import PageTransition from '../components/PageTransition';
import NewRequestModal from '../components/forms/NewRequestModal';

export default function DashboardLayout() {
  const location = useLocation();
  const isPos = location.pathname === '/pos';
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#f4f3f1] flex overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white">
      {!isPos && (
        <div className="print:hidden h-full z-20 shrink-0">
          <Sidebar onNewRequest={() => setIsNewRequestModalOpen(true)} />
        </div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isPos && <Header />}
        <main className={`flex-1 relative overflow-y-auto focus:outline-none print:overflow-visible ${isPos ? '' : 'p-6 w-full'} print:p-0`}>
          <div className={isPos ? 'h-full' : 'max-w-[1600px] mx-auto h-full'}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <NewRequestModal 
        isOpen={isNewRequestModalOpen} 
        onClose={() => setIsNewRequestModalOpen(false)} 
      />
    </div>
  );
}
