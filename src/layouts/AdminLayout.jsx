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
    <div className="admin-layout isolate flex min-h-screen bg-[#042f2e] text-slate-900">
      <Sidebar
        type="admin"
        collapsed={collapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={handleSidebarToggle}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`admin-main-shell relative flex min-h-screen min-w-0 flex-1 flex-col ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="absolute inset-0 overflow-hidden bg-[#f4f8f4]">
          <div className="absolute left-[-120px] top-[-100px] h-[280px] w-[280px] rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute right-[-90px] top-16 h-[240px] w-[240px] rounded-full bg-blue-100/45 blur-3xl" />
          <div className="absolute bottom-[-120px] left-1/3 h-[220px] w-[220px] rounded-full bg-amber-100/40 blur-3xl" />
        </div>

        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#f4f8f4]/88 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white text-emerald-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)] transition-colors hover:border-emerald-200 hover:text-emerald-800"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu admin"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Admin Dashboard</p>
              <p className="truncate text-xs text-slate-500">LKP Parduli Rasa</p>
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
