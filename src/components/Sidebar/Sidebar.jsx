import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  Award,
  BookOpen,
  Building2,
  ChevronLeft,
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
  { path: '/dashboard/classroom/classwork', icon: BookOpen, label: 'Kelas Saya' },
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
];

function BrandShield() {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" fill="none" aria-hidden="true">
      <path
        d="M32 4 54 13v16c0 14.2-8.7 23.4-22 31C18.7 52.4 10 43.2 10 29V13L32 4Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2.5"
      />
      <path
        d="M32 14c5.5 5.4 10.7 7.2 14.5 8.1v7.1c0 9.5-5.6 16.6-14.5 22-8.9-5.4-14.5-12.5-14.5-22v-7.1C21.3 21.2 26.5 19.4 32 14Z"
        fill="rgba(255,255,255,0.95)"
      />
      <path
        d="M30 22h4v8h7v4h-7v8h-4v-8h-7v-4h7v-8Z"
        fill="#0f9f61"
      />
      <path
        d="M24.5 18.5h15"
        stroke="#0f9f61"
        strokeLinecap="round"
        strokeWidth="2.8"
      />
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

  const footerTitle = type === 'admin' ? 'Pusat Administrasi' : 'Pusat Belajar';
  const footerDescription = type === 'admin'
    ? 'Pantau data siswa, konten blog, dan komunikasi dari satu dashboard.'
    : 'Pantau progres kelas, status sertifikat, dan konsultasi Anda dari satu dashboard.';

  return (
    <>
      <aside
        className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#075541_0%,#05392f_55%,#042c27_100%)] text-white shadow-[22px_0_60px_-35px_rgba(0,0,0,0.55)] transition-all duration-300 ease-in-out ${
          collapsed ? 'is-collapsed' : ''
        } ${mobileOpen ? 'is-mobile-open' : ''}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_22%)]" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-[18px]">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <BrandShield />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[1.35rem] font-semibold leading-tight tracking-tight text-white">LKP Parduli Rasa</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-100/80">
                  {type === 'admin' ? 'Lembaga Kursus & Pelatihan' : 'Dashboard Siswa'}
                </p>
              </div>
            )}
          </div>

          <button
            className={`flex h-[34px] w-[34px] min-w-[34px] items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition-all hover:bg-white/15 ${collapsed ? 'rotate-180' : ''}`}
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="relative mx-3 mt-3 rounded-[24px] border border-white/10 bg-white/[0.08] px-3 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 min-w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-white shadow-[0_18px_34px_-20px_rgba(16,185,129,0.9)]">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{user?.name || 'Administrator'}</p>
                <p className="mt-0.5 text-[11px] text-emerald-100/70">
                  {type === 'admin' ? 'Super Admin' : `NIS: ${user?.nis || '-'}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative px-4 pt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/[0.45]">
          {!collapsed && 'Navigasi'}
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-[0_22px_40px_-26px_rgba(16,185,129,0.95)]'
                    : 'text-white/[0.72] hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? item.label : ''}
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex min-w-5 items-center justify-center ${isActive ? 'text-white' : 'text-white/[0.72] group-hover:text-white'}`}>
                      <item.icon size={19} strokeWidth={2} />
                    </div>
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-white/[0.65] transition-all duration-200 hover:bg-rose-500/15 hover:text-rose-300"
            onClick={handleLogout}
          >
            <div className="flex min-w-5 items-center justify-center">
              <LogOut size={19} strokeWidth={2} />
            </div>
            {!collapsed && <span>Logout</span>}
          </button>

          {!collapsed && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[11px] text-emerald-100/70">
              <p className="font-medium text-white/[0.85]">{footerTitle}</p>
              <p className="mt-1 leading-[1.45]">{footerDescription}</p>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/[0.55] backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onMobileClose || onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
