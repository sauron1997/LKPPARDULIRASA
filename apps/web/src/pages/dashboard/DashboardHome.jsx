import { Award, BookOpen, CalendarDays, CheckCircle2, Clock3, MessageSquare, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentDashboardData } from '../../hooks/student/useStudentDashboardData';
import './Dashboard.css';

function formatPaymentLabel(status) {
  if (status === 'verified') return 'Terverifikasi';
  if (status === 'rejected') return 'Perlu Tindak Lanjut';
  return 'Menunggu Verifikasi';
}

function formatSessionTime(value) {
  if (!value) return 'Waktu belum ditentukan';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getSchedulePreview(schedulePayload) {
  const source = schedulePayload || {};
  const upcoming = Array.isArray(source.upcoming)
    ? source.upcoming
    : Array.isArray(source.upcomingSessions)
      ? source.upcomingSessions
      : [];
  const history = Array.isArray(source.history)
    ? source.history
    : Array.isArray(source.attendanceHistory)
      ? source.attendanceHistory
      : [];
  const summary = source.summary || source.attendanceSummary || null;
  const nextSession = source.nextSession || source.next || upcoming[0] || null;

  return {
    history,
    nextSession,
    summary,
  };
}

export default function DashboardHome() {
  const { isReady, error, portal } = useStudentDashboardData();

  if (!isReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Menyiapkan beranda siswa...</h2>
          <p>Data kelas, evaluasi, dan konsultasi sedang diproses.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Beranda belum bisa dimuat</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!portal.student) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Data siswa belum terhubung</h2>
          <p>Akun ini sudah aktif, tetapi record siswa belum ditemukan. Silakan hubungi admin.</p>
        </div>
      </div>
    );
  }

  const paymentStatus = portal.enrollment?.paymentStatus || portal.student.paymentStatus || 'pending';
  const pendingThreads = portal.threads.filter((thread) => thread.status !== 'replied').length;
  const currentProgram = portal.course?.title || portal.student.program || 'Program belum ditetapkan';
  const schedulePreview = getSchedulePreview(portal.schedule || portal.classSchedule);
  const completionPercent = portal.learning.completionPercent ?? 0;
  const attendanceSummary = schedulePreview.summary || {};
  const attendedCount = attendanceSummary.attendedCount ?? attendanceSummary.presentCount ?? attendanceSummary.checkedInCount ?? 0;
  const totalAttendance = attendanceSummary.totalCount ?? attendanceSummary.sessionCount ?? schedulePreview.history.length;
  const attendanceRate = attendanceSummary.attendanceRate ?? attendanceSummary.rate ?? (
    totalAttendance > 0 ? Math.round((attendedCount / totalAttendance) * 100) : null
  );
  const shouldShowSchedulePreview = Boolean(schedulePreview.nextSession || schedulePreview.summary);
  const activeModules = portal.modules.filter((module) => module.status !== 'upcoming');
  const certificateProgress = portal.certificateGate.totalCount > 0
    ? Math.round((portal.certificateGate.doneCount / portal.certificateGate.totalCount) * 100)
    : 0;
  const classroomStatusLabel = paymentStatus === 'verified'
    ? 'Classroom aktif penuh'
    : paymentStatus === 'rejected'
      ? 'Classroom perlu tindak lanjut'
      : 'Classroom menunggu verifikasi';
  const nextSessionDate = formatSessionTime(
    schedulePreview.nextSession?.startsAt
    || schedulePreview.nextSession?.scheduledAt
    || schedulePreview.nextSession?.date,
  );
  const spotlightItems = [
    {
      icon: BookOpen,
      title: 'Classroom-first',
      description: `${activeModules.length} modul siap dibuka dari ruang belajar utama Anda.`,
    },
    {
      icon: CalendarDays,
      title: 'Jadwal terarah',
      description: shouldShowSchedulePreview
        ? `Pantau sesi ${schedulePreview.nextSession?.title || schedulePreview.nextSession?.topic || 'berikutnya'} tanpa keluar dari beranda.`
        : 'Jadwal akan tampil otomatis setelah sesi berikutnya diterbitkan.',
    },
    {
      icon: ShieldCheck,
      title: 'Sertifikat terukur',
      description: `${portal.certificateGate.doneCount} dari ${portal.certificateGate.totalCount} syarat sudah terbaca oleh sistem.`,
    },
  ];

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-hero">
        <div className="student-hero-copy">
          <div className="student-hero-badges">
            <span className="student-pill">Studio Vokasi</span>
            <span className={`student-status-chip ${paymentStatus}`}>{formatPaymentLabel(paymentStatus)}</span>
          </div>

          <h1>Halo, {portal.student.name}</h1>
          <p>
            Anda sedang menempuh <strong>{currentProgram}</strong> dalam studio belajar yang fokus pada
            classroom, progres, jadwal, dan checkpoint kelulusan secara real-time.
          </p>

          <div className="student-hero-meta">
            <span>NIS: {portal.student.nis}</span>
            <span>Status kelas: {portal.enrollment?.status || portal.student.status}</span>
            <span>{classroomStatusLabel}</span>
          </div>

          <div className="student-hero-actions">
            <Link to="/dashboard/classroom/classwork" className="btn btn-primary">
              <BookOpen size={16} /> Masuk Classroom
            </Link>
            <Link to="/dashboard/classroom/schedule" className="btn btn-outline">
              <CalendarDays size={16} /> Lihat Jadwal
            </Link>
            <Link to="/dashboard/pesan" className="btn btn-ghost">
              <MessageSquare size={16} /> Konsultasi
            </Link>
          </div>

          <div className="student-hero-spotlight">
            {spotlightItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="student-hero-spotlight-card">
                  <div className="student-hero-spotlight-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="student-hero-panel">
          <div className="student-progress-ring modern">
            <div className="student-progress-ring-track">
              <div className="student-progress-ring-fill" style={{ '--student-progress': `${completionPercent}%` }} />
              <strong>{completionPercent}%</strong>
            </div>
            <span>Progress studio belajar</span>
          </div>

          <div className="student-hero-stack">
            <div className="student-hero-panel-card">
              <span>Checkpoint aktif</span>
              <strong>{portal.learning.currentModule?.title || 'Belum ada modul aktif'}</strong>
              <p>Lanjutkan dari modul yang sedang berjalan agar ritme belajar tetap konsisten.</p>
            </div>

            <div className="student-hero-summary">
              <div>
                <span>Modul aktif</span>
                <strong>{activeModules.length}/{portal.modules.length}</strong>
              </div>
              <div>
                <span>Konsultasi berjalan</span>
                <strong>{pendingThreads}</strong>
              </div>
              <div>
                <span>Gate sertifikat</span>
                <strong>{portal.certificateGate.doneCount}/{portal.certificateGate.totalCount}</strong>
              </div>
            </div>

            <div className="student-hero-mini-board">
              <div>
                <span>Sesi berikutnya</span>
                <strong>{schedulePreview.nextSession?.title || schedulePreview.nextSession?.topic || 'Menunggu jadwal baru'}</strong>
                <p>{nextSessionDate}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dash-stats-grid">
        <article className="dash-stat-card">
          <div className="dash-stat-icon"><BookOpen size={22} /></div>
          <div>
            <div className="dash-stat-value">{portal.learning.completedModules}/{portal.learning.totalModules}</div>
            <div className="dash-stat-label">Modul terselesaikan</div>
          </div>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-icon cert"><ShieldCheck size={22} /></div>
          <div>
            <div className="dash-stat-value">{certificateProgress}%</div>
            <div className="dash-stat-label">Progres gate sertifikat</div>
          </div>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-icon msg"><MessageSquare size={22} /></div>
          <div>
            <div className="dash-stat-value">{attendanceRate == null ? '--' : `${attendanceRate}%`}</div>
            <div className="dash-stat-label">Rasio kehadiran</div>
          </div>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-icon info"><Clock3 size={22} /></div>
          <div>
            <div className="dash-stat-value">{pendingThreads}</div>
            <div className="dash-stat-label">Thread butuh respons</div>
          </div>
        </article>
      </section>

      <section className="student-action-grid">
        <article className="student-action-card accent-classroom">
          <span className="student-section-eyebrow">Arah Utama</span>
          <h2>Masuk ke classroom dan lanjutkan modul aktif</h2>
          <p>
            Semua jalur belajar siswa dirapikan agar dimulai dari classroom,
            bukan dari menu terpisah. Ini jadi titik masuk paling cepat untuk materi, tugas, dan nilai.
          </p>
          <Link to="/dashboard/classroom/classwork" className="student-inline-link">Buka classwork</Link>
        </article>

        <article className="student-action-card accent-schedule">
          <span className="student-section-eyebrow">Jadwal</span>
          <h2>{schedulePreview.nextSession?.title || schedulePreview.nextSession?.topic || 'Belum ada sesi terjadwal'}</h2>
          <p>{nextSessionDate}</p>
          <Link to="/dashboard/classroom/schedule" className="student-inline-link">Pantau jadwal kelas</Link>
        </article>

        <article className="student-action-card accent-certificate">
          <span className="student-section-eyebrow">Kelulusan</span>
          <h2>{portal.certificateGate.headline}</h2>
          <p>{portal.certificateGate.description}</p>
          <Link to="/dashboard/sertifikat" className="student-inline-link">Buka gate sertifikat</Link>
        </article>
      </section>

      <section className="student-home-grid">
        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Classroom</span>
              <h2>Ruang kerja belajar Anda</h2>
            </div>
            <Link to="/dashboard/classroom/classwork" className="student-inline-link">Lihat detail</Link>
          </div>

          <div className="student-highlight-block studio">
            <h3>{currentProgram}</h3>
            <p>{portal.course?.description || 'Program belajar ini sudah terhubung ke akun Anda.'}</p>
            <div className="student-progress-bar" aria-hidden="true">
              <div className="student-progress-bar-fill" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <div className="student-focus-list">
            <div className="student-focus-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Modul aktif</strong>
                <p>{activeModules.length} modul sudah dapat dipelajari langsung dari classroom siswa.</p>
              </div>
            </div>
            <div className="student-focus-item">
              <Clock3 size={18} />
              <div>
                <strong>Checkpoint saat ini</strong>
                <p>{portal.learning.currentModule?.title || 'Belum ada modul aktif.'}</p>
              </div>
            </div>
            <div className="student-focus-item">
              <Award size={18} />
              <div>
                <strong>Target kelulusan</strong>
                <p>{portal.certificateGate.headline}</p>
              </div>
            </div>
          </div>
        </article>

        {shouldShowSchedulePreview ? (
          <article className="student-panel-card">
            <div className="student-panel-heading">
              <div>
                <span className="student-section-eyebrow">Jadwal</span>
                <h2>Studio schedule</h2>
              </div>
              <Link to="/dashboard/classroom/schedule" className="student-inline-link">Buka jadwal</Link>
            </div>

            <div className="student-highlight-block schedule">
              <h3>{schedulePreview.nextSession?.title || schedulePreview.nextSession?.topic || 'Belum ada sesi baru'}</h3>
              <p>{nextSessionDate}</p>
            </div>

            <div className="student-focus-list">
              <div className="student-focus-item">
                <CalendarDays size={18} />
                <div>
                  <strong>Absensi</strong>
                  <p>{attendanceRate == null ? 'Ringkasan kehadiran akan muncul setelah sesi berjalan.' : `${attendanceRate}% kehadiran tercatat.`}</p>
                </div>
              </div>
              <div className="student-focus-item">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Sesi hadir</strong>
                  <p>{attendedCount}/{totalAttendance} sesi sudah check-in.</p>
                </div>
              </div>
              <div className="student-focus-item">
                <Clock3 size={18} />
                <div>
                  <strong>Ritme kelas</strong>
                  <p>Beranda kini menempatkan jadwal lebih dekat dengan classroom agar transisi belajar lebih cepat.</p>
                </div>
              </div>
            </div>
          </article>
        ) : null}

        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Kelulusan</span>
              <h2>Checklist sertifikat</h2>
            </div>
            <Link to="/dashboard/sertifikat" className="student-inline-link">Buka gate</Link>
          </div>

          <div className="student-highlight-block certificate">
            <h3>{portal.certificateGate.downloadReady ? 'Dokumen hampir siap diunduh' : 'Syarat kelulusan sedang dipenuhi'}</h3>
            <p>{portal.certificateGate.description}</p>
            <div className="student-progress-bar" aria-hidden="true">
              <div className="student-progress-bar-fill warm" style={{ width: `${certificateProgress}%` }} />
            </div>
          </div>

          <div className="student-checklist">
            {portal.certificateGate.checklist.map((item) => (
              <div key={item.id} className={`student-check-item ${item.done ? 'done' : ''}`}>
                <div className="student-check-indicator">{item.done ? 'OK' : '--'}</div>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="student-panel-card student-support-panel">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Support</span>
              <h2>Konsultasi tetap dekat</h2>
            </div>
            <Link to="/dashboard/pesan" className="student-inline-link">Buka pesan</Link>
          </div>

          <div className="student-focus-list">
            <div className="student-focus-item">
              <MessageSquare size={18} />
              <div>
                <strong>{portal.threads.length} total thread</strong>
                <p>{pendingThreads} percakapan masih menunggu respons atau tindak lanjut.</p>
              </div>
            </div>
            <div className="student-focus-item">
              <ShieldCheck size={18} />
              <div>
                <strong>Topik yang cocok dikonsultasikan</strong>
                <p>Jadwal, materi, pembayaran, sertifikat, dan pembaruan status kelas siswa.</p>
              </div>
            </div>
          </div>

          <div className="student-hero-actions compact">
            <Link to="/dashboard/pesan" className="btn btn-primary">
              <MessageSquare size={16} /> Lanjutkan konsultasi
            </Link>
            <Link to="/dashboard/identitas" className="btn btn-ghost">
              <CheckCircle2 size={16} /> Cek identitas
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
