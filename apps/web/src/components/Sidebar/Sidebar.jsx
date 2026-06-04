import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  Award,
  Banknote,
  BookOpen,
  Building2,
  ChevronLeft,
  ClipboardCheck,
  CreditCard,
  FileText,
  Image,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageCircle,
  MessageSquare,
  Package,
  Shield,
  Upload,
  User,
  Users,
} from 'lucide-react';

const studentMenu = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Beranda', end: true },
  { path: '/dashboard/identitas', icon: User, label: 'Profil' },
  { path: '/dashboard/sertifikat', icon: Award, label: 'Sertifikat' },
  { path: '/dashboard/pembayaran', icon: CreditCard, label: 'Pembayaran' },
  { path: '/dashboard/classroom/classwork', icon: BookOpen, label: 'Kelas & Materi' },
  { path: '/dashboard/pesan', icon: MessageSquare, label: 'Konsultasi' },
];

const adminMenu = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/blog', icon: FileText, label: 'Blog' },
  { path: '/admin/galeri', icon: Image, label: 'Galeri' },
  { path: '/admin/profil', icon: Building2, label: 'Profil Lembaga' },
  { path: '/admin/paket-kursus', icon: Package, label: 'Paket Kursus' },
  { path: '/admin/akreditasi', icon: Shield, label: 'Akreditasi' },
  { path: '/admin/sertifikat', icon: Upload, label: 'Sertifikat' },
  { path: '/admin/classroom', icon: Users, label: 'Classroom' },
  { path: '/admin/respon', icon: MessageCircle, label: 'Respon Publik' },
  { path: '/admin/pesan-siswa', icon: MessageSquare, label: 'Pesan Siswa' },
  { path: '/admin/sosial-media', icon: Link2, label: 'Sosial Media' },
  { path: '/admin/payment-reviews', icon: ClipboardCheck, label: 'Review Pembayaran' },
  { path: '/admin/payment-settings', icon: Banknote, label: 'Pengaturan Pembayaran' },
];

function BrandShield() {
  return (
    <svg viewBox="0 0 72 72" className="h-10 w-10" fill="none" aria-hidden="true">
      <path
        d="M13 29c0-10.5 10.3-19 23-19s23 8.5 23 19"
        stroke="rgba(255,255,255,0.4)"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M36 6 59 15.5v16.7c0 14.8-9.1 24.3-23 32.3-13.9-8-23-17.5-23-32.3V15.5L36 6Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2.5"
      />
      <path
        d="M36 17c5.8 5.7 11.2 7.7 15.2 8.6v6.8c0 9.8-5.8 17.2-15.2 22.8-9.4-5.6-15.2-13-15.2-22.8v-6.8c4-1 9.4-2.9 15.2-8.6Z"
        fill="rgba(255,255,255,0.95)"
      />
      <path
        d="M24 28.5c4.5-1.3 8.2-3.5 12-6.8 3.8 3.3 7.5 5.5 12 6.8v5.2c0 6.4-3.8 11.8-12 17.2-8.2-5.4-12-10.8-12-17.2v-5.2Z"
        fill="url(#brand-book)"
      />
      <path
        d="M27 30.5h7.2c1 0 1.9.4 2.6 1.1.7-.7 1.6-1.1 2.6-1.1H46"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M28 36.2h6.4c1 0 1.9.4 2.6 1.1.7-.7 1.6-1.1 2.6-1.1H44"
        stroke="rgba(255,255,255,0.9)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M33.4 26.6 36 30.8l2.6-4.2"
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <defs>
        <linearGradient id="brand-book" x1="24" x2="48" y1="24" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.5" stopColor="#4db6ac" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Sidebar({ type = 'student', collapsed, mobileOpen = false, onToggle, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = type === 'admin' ? adminMenu : studentMenu;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const shellTitle = type === 'admin' ? 'LKP Parduli Rasa' : 'Portal Siswa';
  const shellKicker = type === 'admin' ? 'Lembaga Kursus & Pelatihan' : 'Akses belajar personal';
  const sectionLabel = type === 'admin' ? 'Operasional' : 'Perjalanan belajar';
  const footerTitle = type === 'admin' ? 'Pusat Administrasi' : 'Pusat Belajar';
  const footerDescription = type === 'admin'
    ? 'Pantau data siswa, konten blog, dan komunikasi dari satu dashboard.'
    : 'Pantau progres kelas, status sertifikat, dan konsultasi Anda dari satu dashboard.';

  return (
    <>
      <aside
        className={`admin-sidebar shell-sidebar-frame fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r text-white transition-all duration-300 ease-in-out ${
          collapsed ? 'is-collapsed' : ''
        } ${mobileOpen ? 'is-mobile-open' : ''}`}
      >
        <div className="shell-sidebar-overlay absolute inset-0" />
        <div className="shell-sidebar-ornament absolute inset-x-4 top-4 h-28 rounded-[28px] border border-white/10 opacity-80" />
        <div className="absolute left-4 right-4 top-[4.6rem] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute left-1/2 top-[5.1rem] h-24 w-[78%] -translate-x-1/2 rounded-[999px] border border-white/10 opacity-40" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-[18px]">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="shell-sidebar-brand-chip flex h-12 w-12 min-w-12 items-center justify-center rounded-[1.25rem] border backdrop-blur-sm">
              <BrandShield />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[1.2rem] font-semibold leading-tight tracking-tight text-white">{shellTitle}</p>
                <p className="shell-sidebar-kicker mt-0.5 truncate text-[11px] font-medium tracking-[0.14em] uppercase">
                  {shellKicker}
                </p>
              </div>
            )}
          </div>

          <button
            className={`shell-sidebar-brand-chip flex h-[34px] w-[34px] min-w-[34px] items-center justify-center rounded-xl border text-white transition-all hover:bg-white/15 ${collapsed ? 'rotate-180' : ''}`}
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="shell-sidebar-user-card relative mx-3 mt-3 overflow-hidden rounded-[24px] border px-3 py-3 backdrop-blur-sm">
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-white ${
              type === 'admin'
                ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_18px_34px_-20px_rgba(16,185,129,0.9)]'
                : 'bg-gradient-to-br from-teal-300 via-emerald-400 to-lime-400 shadow-[0_18px_34px_-20px_rgba(77,182,172,0.9)]'
            }`}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{user?.name || 'Administrator'}</p>
                <p className="shell-sidebar-kicker mt-0.5 text-[11px]">
                  {type === 'admin' ? 'Super Admin' : `NIS: ${user?.nis || '-'}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="shell-sidebar-section relative px-4 pt-5 text-[10px] font-semibold uppercase tracking-[0.24em]">
          {!collapsed && sectionLabel}
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `shell-sidebar-item group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive ? 'is-active' : ''
                }`}
                title={collapsed ? item.label : ''}
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex min-w-5 items-center justify-center ${isActive ? 'text-white' : 'text-inherit'}`}>
                      <item.icon size={19} strokeWidth={2} />
                    </div>
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && isActive && (
                      <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_0_4px_rgba(255,255,255,0.14)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <button
            className="shell-sidebar-logout flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium transition-all duration-200"
            onClick={handleLogout}
          >
            <div className="flex min-w-5 items-center justify-center">
              <LogOut size={19} strokeWidth={2} />
            </div>
            {!collapsed && <span>Logout</span>}
          </button>

          {!collapsed && (
            <div className="shell-sidebar-footer-card mt-3 rounded-2xl border px-3 py-2.5 text-[11px]">
              <p className="shell-sidebar-footer-title font-medium">{footerTitle}</p>
              <p className="mt-1 leading-[1.45]">{footerDescription}</p>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="shell-mobile-overlay fixed inset-0 z-40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onMobileClose || onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
