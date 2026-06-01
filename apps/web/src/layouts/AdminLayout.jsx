import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import Sidebar from '../components/Sidebar/Sidebar';

export default function AdminLayout() {
  const { isAdmin, isAuthenticated, isStudent, isLoadingSession } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoadingSession) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isStudent) return <Navigate to="/dashboard" replace />;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const handleSidebarToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
      return;
    }

    setCollapsed((current) => !current);
  };

  return (
    <div className="admin-layout isolate flex min-h-screen shell-surface text-slate-900">
      <Sidebar
        type="admin"
        collapsed={collapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={handleSidebarToggle}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`admin-main-shell relative flex min-h-screen min-w-0 flex-1 flex-col ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="absolute inset-0 overflow-hidden shell-surface">
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),transparent)]" />
          <div className="absolute left-[-120px] top-[-110px] h-[300px] w-[300px] rounded-full bg-emerald-100/75 blur-3xl" />
          <div className="absolute right-[-90px] top-14 h-[240px] w-[240px] rounded-full bg-teal-100/45 blur-3xl" />
          <div className="absolute bottom-[-130px] left-[32%] h-[240px] w-[240px] rounded-full bg-amber-100/45 blur-3xl" />
          <div className="absolute left-12 top-24 h-40 w-40 rounded-[36px] border border-emerald-200/50 bg-white/25 rotate-12 blur-2xl" />
        </div>

        <header className="shell-panel sticky top-0 z-20 border-b backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="shell-menu-button inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)] transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu admin"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="shell-title text-sm font-semibold">Pusat Kendali Admin</p>
              <p className="shell-subtitle truncate text-xs">LKP Parduli Rasa</p>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8 2xl:px-12">
          <div className="mx-auto w-full max-w-[1520px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
