import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Image,
  MessageCircle,
  MessageSquare,
  Package,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useDashboardData } from '../../hooks/admin/useDashboardData';
import { adminSurfaceClassName, cn } from '../../components/admin/adminClassNames';
import {
  AdminHero,
  AdminLoadingState,
  AdminNotice,
  AdminSearchInput,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminSidebarPanel,
  AdminTag,
} from '../../components/admin/AdminUi';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const AdminDashboardCharts = lazy(() => import('../../components/admin/AdminDashboardCharts'));

const statThemeMap = {
  emerald: {
    tile: 'bg-[#ecfbf2] text-[#0f9f61]',
    delta: 'text-[#179d63]',
  },
  amber: {
    tile: 'bg-[#fff6e8] text-[#f08a1f]',
    delta: 'text-[#179d63]',
  },
  pine: {
    tile: 'bg-[#e9f4ef] text-[#235845]',
    delta: 'text-[#235845]',
  },
  orange: {
    tile: 'bg-[#fff1de] text-[#e97b17]',
    delta: 'text-[#d95f10]',
  },
  rose: {
    tile: 'bg-[#fff0f0] text-[#ef4444]',
    delta: 'text-[#ef4444]',
  },
};

const statusToneMap = {
  Aktif: 'bg-emerald-50 text-emerald-700',
  Lulus: 'bg-[#eef6f1] text-[#235845]',
  Verifikasi: 'bg-[#eef6f1] text-[#235845]',
  Baru: 'bg-emerald-50 text-emerald-700',
};

const paymentToneMap = {
  verified: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const taskToneMap = {
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

const quickActionToneMap = {
  emerald: 'bg-[#f1fbf5] text-[#0f9f61] shadow-[inset_0_0_0_1px_rgba(15,159,97,0.08)]',
  pine: 'bg-[#eef6f1] text-[#235845] shadow-[inset_0_0_0_1px_rgba(35,88,69,0.1)]',
  orange: 'bg-[#fff1de] text-[#e97b17] shadow-[inset_0_0_0_1px_rgba(233,123,23,0.1)]',
  amber: 'bg-[#fff6e8] text-[#f08a1f] shadow-[inset_0_0_0_1px_rgba(240,138,31,0.08)]',
};

const taskIconMap = {
  'assessment-review': ClipboardCheck,
  'assessment-retry': BookOpen,
  'certificate-upload': Award,
  payment: CreditCard,
  'student-message': MessageSquare,
  'public-message': MessageCircle,
};

function buildAdminClassroomPath(courseId, tab = 'stream') {
  return courseId ? `/admin/classroom/${courseId}/${tab}` : '/admin/classroom';
}

const quickActions = [
  { to: '/admin/classroom', label: 'Kelola Classroom', hint: 'Kelas, peserta, dan nilai', icon: UserPlus, tone: 'emerald' },
  { to: '/admin/blog', label: 'Kelola Blog', hint: 'Artikel & kategori', icon: FileText, tone: 'emerald' },
  { to: '/admin/galeri', label: 'Kelola Galeri', hint: 'Foto & dokumentasi', icon: Image, tone: 'pine' },
  { to: '/admin/paket-kursus', label: 'Paket Kursus', hint: 'Program & harga', icon: Package, tone: 'orange' },
  { to: '/admin/pesan-siswa', label: 'Pesan Siswa', hint: 'Kotak masuk siswa', icon: MessageSquare, tone: 'pine' },
  { to: '/admin/respon', label: 'Laporan', hint: 'Pesan publik masuk', icon: BarChart3, tone: 'amber' },
];

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTableStatus(status) {
  if (status === 'Aktif') return 'Baru';
  if (status === 'Lulus') return 'Verifikasi';
  return status;
}

function formatPaymentStatus(status) {
  if (status === 'verified') return 'Lunas';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Ditolak';
  return status;
}

function StatCard({ icon, label, value, delta, theme, detail = 'dari bulan lalu' }) {
  const tone = statThemeMap[theme];
  const Icon = icon;

  return (
    <article className={cn(adminSurfaceClassName, 'group flex min-h-[178px] flex-col justify-between p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.3)] lg:p-6')}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.tile}`}>
          <Icon size={24} strokeWidth={1.8} />
        </div>
        <ArrowUpRight className="text-slate-300 transition-colors group-hover:text-emerald-500" size={18} />
      </div>

      <div className="mt-5 space-y-1.5">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-[1.85rem] font-semibold leading-none tracking-tight text-slate-900">{value}</h3>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        <span className={`font-semibold ${tone.delta}`}>{delta}</span>
        <span className="text-slate-400">{detail}</span>
      </div>
    </article>
  );
}

function DashboardToolbar({ notificationCount, onSearchChange, search, tasks, user, logout }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <AdminSecondaryButton className="h-12 gap-3 px-[18px]">
        <CalendarDays size={18} className="text-slate-400" />
        <span>1 Mei - 31 Mei 2026</span>
        <ChevronDown size={16} className="text-slate-400" />
      </AdminSecondaryButton>

      <AdminSearchInput
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Cari aksi, tugas, atau siswa..."
      />

      <div className="relative" ref={notificationRef}>
        <AdminSecondaryButton
          className="relative h-12 w-12 px-0 text-slate-600"
          onClick={() => setShowNotifications((current) => !current)}
          aria-label="Buka notifikasi"
          aria-expanded={showNotifications}
          aria-controls="admin-dashboard-notifications"
        >
          <Bell size={20} />
          <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {notificationCount}
          </span>
        </AdminSecondaryButton>

        {showNotifications ? (
          <div
            id="admin-dashboard-notifications"
            role="dialog"
            aria-label="Notifikasi terbaru"
            className="absolute right-0 top-[calc(100%+12px)] z-30 w-[320px] rounded-[26px] border border-white/80 bg-white/95 p-3 shadow-[0_32px_80px_-34px_rgba(15,23,42,0.4)] backdrop-blur"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <h2 className="text-sm font-semibold text-slate-900">Notifikasi Terbaru</h2>
              <AdminTag tone="emerald">Hari ini</AdminTag>
            </div>

            <div className="mt-2 space-y-2">
              {tasks.map((task) => {
                const Icon = taskIconMap[task.id] || Bell;
                return (
                  <div key={task.id} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 px-3 py-3">
                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${taskToneMap[task.tone]}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{task.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative" ref={profileRef}>
        <AdminSecondaryButton
          className="h-12 gap-3 px-3 pr-4"
          onClick={() => setShowProfileMenu((current) => !current)}
          aria-label="Buka menu profil"
          aria-expanded={showProfileMenu}
          aria-controls="admin-dashboard-profile-menu"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(5,150,105,0.9)]">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-slate-800">{user?.name || 'Administrator'}</span>
            <span className="block text-xs text-slate-400">Administrator</span>
          </span>
          <ChevronDown size={16} className="text-slate-400" />
        </AdminSecondaryButton>

        {showProfileMenu ? (
          <div
            id="admin-dashboard-profile-menu"
            role="menu"
            aria-label="Menu profil admin"
            className="absolute right-0 top-[calc(100%+12px)] z-30 w-60 rounded-[24px] border border-white/80 bg-white/95 p-2.5 shadow-[0_32px_80px_-34px_rgba(15,23,42,0.4)] backdrop-blur"
          >
            <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{user?.name || 'Administrator'}</p>
              <p className="mt-1 text-xs text-slate-500">admin@lkppardulirasa.com</p>
            </div>

            <div className="mt-2 space-y-1">
              <Link
                to="/admin/profil"
                role="menuitem"
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                Profil Lembaga
                <ArrowUpRight size={16} />
              </Link>
              <button
                role="menuitem"
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                onClick={() => logout()}
              >
                Logout
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const dashboardData = useDashboardData();
  const [search, setSearch] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const {
    summary,
    courseHealthTop,
    programDistribution,
    recentEnrollments,
    registrationTrend,
    registrationTrendIsDefault,
    reviewQueueTop,
    tasks,
  } = dashboardData;
  const isReady = dashboardData.isReady;
  const error = dashboardData.error;

  const normalizedSearch = useMemo(
    () => deferredSearch.trim().toLowerCase(),
    [deferredSearch],
  );

  const stats = useMemo(() => [
    { label: 'Total Siswa', value: summary.totalStudents, delta: `${summary.totalStudents} aktif`, icon: Users, theme: 'pine', detail: 'basis siswa yang terbaca' },
    { label: 'Submission Review', value: summary.reviewQueueCount, delta: `${summary.retryCount} retry`, icon: ClipboardCheck, theme: 'rose', detail: 'checkpoint perlu ulang' },
    { label: 'Artikel Blog', value: summary.totalBlogPosts, delta: `${summary.totalBlogPosts} terbit`, icon: FileText, theme: 'emerald', detail: 'konten yang tampil di sistem' },
    { label: 'Pesan Publik Baru', value: summary.unreadPublicCount, delta: `${summary.unreadPublicCount} perlu balasan`, icon: MessageCircle, theme: 'amber', detail: 'inbox publik belum selesai' },
    { label: 'Pesan Siswa Baru', value: summary.unreadStudentCount, delta: `${summary.unreadStudentCount} belum dibaca`, icon: MessageSquare, theme: 'pine', detail: 'percakapan siswa aktif' },
    { label: 'Bayar Pending', value: summary.pendingPayments, delta: `${summary.pendingPayments} transaksi`, icon: CreditCard, theme: 'orange', detail: 'butuh verifikasi manual' },
  ], [
    summary.pendingPayments,
    summary.totalBlogPosts,
    summary.totalStudents,
    summary.retryCount,
    summary.unreadPublicCount,
    summary.unreadStudentCount,
    summary.reviewQueueCount,
  ]);

  const healthSignals = useMemo(() => ([
    {
      label: 'Review tertunda',
      value: summary.reviewQueueCount,
      tone: 'rose',
      note: 'Perlu perhatian instruktur atau admin.',
    },
    {
      label: 'Pembayaran pending',
      value: summary.pendingPayments,
      tone: 'amber',
      note: 'Menunggu verifikasi atau tindak lanjut.',
    },
    {
      label: 'Sertifikat siap unggah',
      value: summary.certificateReadyToUploadCount,
      tone: 'emerald',
      note: 'Siap diproses ke tahap publikasi.',
    },
  ]), [
    summary.certificateReadyToUploadCount,
    summary.pendingPayments,
    summary.reviewQueueCount,
  ]);

  const dashboardPulse = useMemo(() => ([
    {
      label: 'Siswa aktif',
      value: summary.totalStudents,
      description: 'Total entitas siswa yang muncul di dashboard saat ini.',
    },
    {
      label: 'Pesan perlu jawaban',
      value: summary.unreadPublicCount + summary.unreadStudentCount,
      description: 'Gabungan inbox publik dan siswa yang belum ditindaklanjuti.',
    },
    {
      label: 'Artikel terbit',
      value: summary.totalBlogPosts,
      description: 'Konten editorial yang sudah tersedia untuk publik.',
    },
  ]), [
    summary.totalBlogPosts,
    summary.totalStudents,
    summary.unreadPublicCount,
    summary.unreadStudentCount,
  ]);

  const fallbackNotes = useMemo(() => {
    const notes = [];

    if (error) {
      notes.push('Sebagian panel memakai data yang berhasil dimuat terakhir; bagian yang gagal tidak diestimasi ulang.');
    }
    if (registrationTrendIsDefault) {
      notes.push('Grafik tren pendaftaran masih memakai seri fallback bawaan karena backend belum mengirim tren aktual.');
    } else if (!registrationTrend.length) {
      notes.push('Grafik tren pendaftaran belum memiliki seri data, jadi panel menampilkan state kosong alih-alih angka asumsi.');
    }
    if (!programDistribution.length) {
      notes.push('Distribusi paket belum tersedia, sehingga komposisi program tidak divisualkan.');
    }
    if (!recentEnrollments.length) {
      notes.push('Tabel pendaftaran terbaru kosong karena belum ada entri yang terbaca untuk periode ini.');
    }

    return notes;
  }, [error, programDistribution.length, recentEnrollments.length, registrationTrend.length, registrationTrendIsDefault]);

  const notificationCount = useMemo(
    () => summary.notificationCount || 0,
    [summary.notificationCount],
  );

  const filteredQuickActions = useMemo(() => (
    normalizedSearch
      ? quickActions.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(normalizedSearch))
      : quickActions
  ), [normalizedSearch]);

  const filteredTasks = useMemo(() => (
    normalizedSearch
      ? tasks.filter((task) => `${task.title} ${task.subtitle}`.toLowerCase().includes(normalizedSearch))
      : tasks
  ), [normalizedSearch, tasks]);

  const filteredEnrollments = useMemo(() => (
    normalizedSearch
      ? recentEnrollments.filter((student) => (
        `${student.name} ${student.program} ${student.status} ${student.paymentStatus}`.toLowerCase().includes(normalizedSearch)
      ))
      : recentEnrollments
  ), [normalizedSearch, recentEnrollments]);

  const reviewQueuePreview = useMemo(
    () => reviewQueueTop.slice(0, 4),
    [reviewQueueTop],
  );

  const courseHealthPreview = useMemo(
    () => courseHealthTop.slice(0, 5),
    [courseHealthTop],
  );

  useEffect(() => {
    const scheduleCharts = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(() => setShowCharts(true), { timeout: 1500 })
      : window.setTimeout(() => setShowCharts(true), 300);

    return () => {
      if (typeof window.cancelIdleCallback === 'function' && typeof scheduleCharts === 'number') {
        window.cancelIdleCallback(scheduleCharts);
        return;
      }

      window.clearTimeout(scheduleCharts);
    };
  }, []);

  if (!isReady) {
    return (
      <AdminLoadingState
        title="Memuat dashboard admin..."
        description="Ringkasan operasional sedang disiapkan dari pusat data frontend."
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Sebagian data dashboard gagal dimuat"
          description={error}
        />
      ) : null}

      <AdminHero
        icon={BarChart3}
        title="Dashboard Admin"
        description="Ruang kendali editorial untuk memantau operasional kelas, ritme konten, dan antrean keputusan harian LKP Parduli Rasa Komputer."
        actions={(
          <DashboardToolbar
            notificationCount={notificationCount}
            onSearchChange={setSearch}
            search={search}
            tasks={tasks}
            user={user}
            logout={logout}
          />
        )}
      >
        <div className="grid gap-4 border-t border-slate-200/80 pt-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="grid gap-3 sm:grid-cols-3">
            {dashboardPulse.map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.28)]">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#235845]/70">{item.label}</p>
                <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[26px] border border-[#f2d7b2] bg-[linear-gradient(135deg,rgba(255,247,237,0.95),rgba(240,249,244,0.92))] px-5 py-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#9a5b20]">Data Integrity Note</p>
              <AdminTag tone={fallbackNotes.length ? 'amber' : 'emerald'}>
                {fallbackNotes.length ? 'Fallback Jujur' : 'Live Snapshot'}
              </AdminTag>
            </div>
            <p className="mt-3 text-lg font-semibold leading-tight text-slate-950">
              {fallbackNotes.length
                ? 'Beberapa panel sedang menampilkan state kosong atau hasil parsial, tanpa angka buatan.'
                : 'Semua panel inti memiliki data yang cukup untuk dibaca sebagai snapshot operasional.'}
            </p>
            <div className="mt-4 space-y-3">
              {(fallbackNotes.length ? fallbackNotes : ['Tidak ada fallback kritikal yang terdeteksi pada panel utama dashboard.']).map((note) => (
                <div key={note} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-[#e97b17]" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminHero>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:gap-7">
        <AdminSectionCard
          title="Learning Operations Desk"
          description="Panel prioritas untuk review submission, retry, dan kesiapan sertifikat tanpa mengubah alur kerja classroom."
          action={(
            <Link to="/admin/classroom" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700">
              Buka Classroom
              <ArrowUpRight size={16} />
            </Link>
          )}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {healthSignals.map((signal) => (
              <div
                key={signal.label}
                className={cn(
                  'rounded-[24px] border px-4 py-4',
                  signal.tone === 'rose' && 'border-rose-100 bg-rose-50/70',
                  signal.tone === 'amber' && 'border-[#f2d7b2] bg-[#fff4e8]',
                  signal.tone === 'emerald' && 'border-emerald-100 bg-emerald-50/70',
                )}
              >
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.18em]',
                    signal.tone === 'rose' && 'text-rose-700/80',
                    signal.tone === 'amber' && 'text-[#9a5b20]',
                    signal.tone === 'emerald' && 'text-emerald-700/80',
                  )}
                >
                  {signal.label}
                </p>
                <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-slate-950">{signal.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{signal.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-[22px] border border-rose-100 bg-rose-50/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600/70">Review</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.reviewQueueCount}</p>
            </div>
            <div className="rounded-[22px] border border-amber-100 bg-amber-50/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/70">Retry</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.retryCount}</p>
            </div>
            <div className="rounded-[22px] border border-[#d7e8df] bg-[#eef6f1] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#235845]/80">Belum mulai</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.notStartedCount}</p>
            </div>
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Siap upload</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.certificateReadyToUploadCount}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-100">
            <div className="grid grid-cols-[minmax(0,1.1fr)_120px_110px] bg-slate-50/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Queue review</span>
              <span>Tipe</span>
              <span>Menunggu</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {reviewQueuePreview.map((item) => (
                <Link key={item.id} to={buildAdminClassroomPath(item.course?.id, 'classwork')} className="grid grid-cols-[minmax(0,1.1fr)_120px_110px] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-emerald-50/40">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">{item.student.name}</span>
                    <span className="block truncate text-xs text-slate-500">{item.course?.title}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase text-slate-500">{item.activity?.label || item.submission.type}</span>
                  <span className="text-xs text-slate-500">{item.ageLabel}</span>
                </Link>
              ))}
              {!reviewQueuePreview.length ? (
                <div className="px-4 py-6 text-sm text-slate-500">Tidak ada submission yang menunggu review.</div>
              ) : null}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSidebarPanel
          title="Health Paket"
          description="Bacaan cepat per kursus untuk melihat bottleneck assessment."
          action={<Package size={20} className="text-slate-300" />}
          contentClassName="mt-6 space-y-3"
        >
          {courseHealthPreview.map((item) => (
            <div key={item.course.id} className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.course.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.activeStudents} siswa aktif · {item.averageProgress}% progress rata-rata</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#235845] shadow-[inset_0_0_0_1px_rgba(35,88,69,0.08)]">
                  {item.publishedAssessmentCount}/3 aktif
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminTag tone="rose">{item.reviewCount} review</AdminTag>
                <AdminTag tone="amber">{item.retryCount} retry</AdminTag>
                <AdminTag tone="emerald">{item.eligibleCount} eligible</AdminTag>
              </div>
            </div>
          ))}
        </AdminSidebarPanel>
      </section>

      <section>
        {showCharts ? (
          <Suspense
            fallback={(
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
                <AdminSectionCard
                  title="Tren Pendaftaran Siswa Baru"
                  description="Menyiapkan visual dashboard..."
                >
                  <div className="h-[286px] rounded-[28px] bg-slate-50/80" />
                </AdminSectionCard>
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:gap-7">
                  <AdminSidebarPanel
                    title="Distribusi Paket Kursus"
                    description="Menyiapkan visual dashboard..."
                    contentClassName="mt-6"
                  >
                    <div className="h-[286px] rounded-[28px] bg-slate-50/80" />
                  </AdminSidebarPanel>
                  <AdminSidebarPanel
                    title="Tugas & Pesan Terbaru"
                    description="Ringkasan hal yang perlu ditindaklanjuti."
                    contentClassName="mt-6"
                  >
                    <div className="h-[220px] rounded-[28px] bg-slate-50/80" />
                  </AdminSidebarPanel>
                </div>
              </div>
            )}
          >
            <AdminDashboardCharts
              registrationTrend={registrationTrend}
              programDistribution={programDistribution}
              studentCount={summary.totalStudents}
            >
              <AdminSidebarPanel
                title="Tugas & Pesan Terbaru"
                description="Ringkasan hal yang perlu ditindaklanjuti."
                action={(
                  <Link to="/admin/respon" className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700">
                    Lihat semua
                  </Link>
                )}
                contentClassName="mt-6 space-y-4"
              >
                {filteredTasks.map((task) => {
                  const Icon = taskIconMap[task.id] || Bell;
                  return (
                    <div key={task.id} className="flex items-center gap-4 rounded-[22px] bg-slate-50/[0.85] px-4 py-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${taskToneMap[task.tone]}`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-slate-800">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{task.subtitle}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${taskToneMap[task.tone]}`}>
                        {task.badge}
                      </span>
                    </div>
                  );
                })}

                {!filteredTasks.length ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                    Tidak ada tugas yang cocok dengan pencarian.
                  </div>
                ) : null}
              </AdminSidebarPanel>
            </AdminDashboardCharts>
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
            <AdminSectionCard
              title="Tren Pendaftaran Siswa Baru"
              description="Visual dashboard akan dimuat setelah halaman inti siap."
            >
              <div className="h-[286px] rounded-[28px] bg-slate-50/80" />
            </AdminSectionCard>
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:gap-7">
              <AdminSidebarPanel
                title="Distribusi Paket Kursus"
                description="Visual dashboard akan dimuat setelah halaman inti siap."
                contentClassName="mt-6"
              >
                <div className="h-[286px] rounded-[28px] bg-slate-50/80" />
              </AdminSidebarPanel>
              <AdminSidebarPanel
                title="Tugas & Pesan Terbaru"
                description="Ringkasan hal yang perlu ditindaklanjuti."
                contentClassName="mt-6"
              >
                <div className="h-[220px] rounded-[28px] bg-slate-50/80" />
              </AdminSidebarPanel>
            </div>
          </div>
        )}
      </section>

      <AdminSectionCard
        title="Aksi Cepat"
        description="Pintu masuk utama untuk pekerjaan operasional dan editorial admin."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-6">
          {filteredQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="group rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.28)]"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${quickActionToneMap[action.tone]}`}>
                  <Icon size={20} />
                </div>
                <p className="mt-3.5 text-sm font-semibold text-slate-800">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.hint}</p>
              </Link>
            );
          })}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Pendaftaran Siswa Terbaru"
        description="Data registrasi terakhir yang masuk ke sistem; bila kosong, tabel menampilkan state kosong tanpa substitusi data."
        action={(
          <Link to="/admin/classroom" className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700">
            Lihat classroom
          </Link>
        )}
        bodyClassName="px-0 py-0"
      >
        <div className="overflow-hidden rounded-b-[26px] border-t border-slate-100">
          <Table className="min-w-full border-separate border-spacing-0">
            <TableHeader className="bg-slate-50/90">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">No</TableHead>
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nama</TableHead>
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Program Kursus</TableHead>
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tanggal Daftar</TableHead>
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</TableHead>
                <TableHead className="h-auto px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pembayaran</TableHead>
                <TableHead className="h-auto px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="bg-white">
              {filteredEnrollments.map((student, index) => (
                <TableRow key={student.id} className="transition-colors hover:bg-[#eef6f1]">
                  <TableCell className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">{index + 1}</TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4">
                    <div className="font-semibold text-slate-800">{student.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{student.nis}</div>
                  </TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{student.program}</TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{formatDate(student.registrationDate)}</TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneMap[formatTableStatus(student.status)] || 'bg-slate-100 text-slate-600'}`}>
                      {formatTableStatus(student.status)}
                    </span>
                  </TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentToneMap[student.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {formatPaymentStatus(student.paymentStatus)}
                    </span>
                  </TableCell>
                  <TableCell className="border-t border-slate-100 px-5 py-4 text-right">
                    <Link to={buildAdminClassroomPath(student.courseId, 'people')} aria-label={`Lihat classroom ${student.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                      <Eye size={17} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}

              {!filteredEnrollments.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-500">
                    {normalizedSearch
                      ? 'Tidak ada data siswa yang cocok dengan pencarian.'
                      : 'Belum ada data pendaftaran yang bisa ditampilkan pada snapshot ini.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </AdminSectionCard>
    </div>
  );
}
