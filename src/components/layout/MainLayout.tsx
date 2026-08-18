import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function MainLayout() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize WebSocket connection for real-time notifications
  const { isConnected } = useWebSocket({
    autoConnect: true,
    showToastNotifications: true,
  });

  // Page transition effect
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className={`
          flex-1 overflow-y-auto
          pb-20 lg:pb-0
          transition-opacity duration-300
          ${isTransitioning ? 'opacity-0' : 'opacity-100'}
        `}>
          <div className={`
            transition-transform duration-300
            ${isTransitioning ? 'translate-y-2' : 'translate-y-0'}
          `}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
