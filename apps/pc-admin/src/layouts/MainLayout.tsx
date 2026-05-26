import { useState } from 'react';
import { Outlet } from 'react-router';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        className="flex min-h-screen flex-1 flex-col transition-[margin-left] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 60 : 220 }}
      >
        <TopBar title="" />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
