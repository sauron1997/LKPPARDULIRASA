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
  const attendanceSummary = schedulePreview.summary || {};
  const attendedCount = attendanceSummary.attendedCount ?? attendanceSummary.presentCount ?? attendanceSummary.checkedInCount ?? 0;
  const totalAttendance = attendanceSummary.totalCount ?? attendanceSummary.sessionCount ?? schedulePreview.history.length;
  const attendanceRate = attendanceSummary.attendanceRate ?? attendanceSummary.rate ?? (
    totalAttendance > 0 ? Math.round((attendedCount / totalAttendance) * 100) : null
  );
  const shouldShowSchedulePreview = Boolean(schedulePreview.nextSession || schedulePreview.summary);

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-hero">
        <div className="student-hero-copy">
          <div className="student-hero-badges">
            <span className="student-pill">Beranda</span>
            <span className={`student-status-chip ${paymentStatus}`}>{formatPaymentLabel(paymentStatus)}</span>
          </div>

          <h1>Halo, {portal.student.name}</h1>
          <p>
            Anda sedang mengikuti <strong>{currentProgram}</strong>. Gunakan dashboard ini
            untuk mengakses modul, memantau evaluasi, melihat sertifikat, dan berkonsultasi dengan admin.
          </p>

          <div className="student-hero-meta">
            <span>NIS: {portal.student.nis}</span>
            <span>Status kelas: {portal.enrollment?.status || portal.student.status}</span>
            <span>Progres: {portal.learning.completionPercent}%</span>
          </div>

          <div className="student-hero-actions">
            <Link to="/dashboard/classroom/classwork" className="btn btn-primary">
              <BookOpen size={16} /> Buka Kelas Saya
            </Link>
            <Link to="/dashboard/sertifikat" className="btn btn-outline">
              <Award size={16} /> Cek Sertifikat
            </Link>
            <Link to="/dashboard/pesan" className="btn btn-ghost">
              <MessageSquare size={16} /> Konsultasi
            </Link>
          </div>
        </div>

        <div className="student-hero-panel">
          <div className="student-progress-ring">
            <strong>{portal.learning.completionPercent}%</strong>
            <span>Progres belajar</span>
          </div>

          <div className="student-hero-summary">
            <div>
              <span>Modul aktif</span>
              <strong>{portal.modules.filter((module) => module.status !== 'upcoming').length}/{portal.modules.length}</strong>
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
            <div className="dash-stat-value">{portal.certificateGate.downloadReady ? 'Siap' : 'Proses'}</div>
            <div className="dash-stat-label">Status sertifikat</div>
          </div>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-icon msg"><MessageSquare size={22} /></div>
          <div>
            <div className="dash-stat-value">{portal.threads.length}</div>
            <div className="dash-stat-label">Total thread konsultasi</div>
          </div>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-icon info"><Clock3 size={22} /></div>
          <div>
            <div className="dash-stat-value">{formatPaymentLabel(paymentStatus)}</div>
            <div className="dash-stat-label">Status akses materi</div>
          </div>
        </article>
      </section>

      <section className="student-home-grid">
        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Kelas Saya</span>
              <h2>Fokus pembelajaran</h2>
            </div>
            <Link to="/dashboard/classroom/classwork" className="student-inline-link">Lihat detail</Link>
          </div>

          <div className="student-highlight-block">
            <h3>{currentProgram}</h3>
            <p>{portal.course?.description || 'Program belajar ini sudah terhubung ke akun Anda.'}</p>
          </div>

          <div className="student-focus-list">
            <div className="student-focus-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Modul aktif</strong>
                <p>{portal.modules.filter((module) => module.status !== 'upcoming').length} modul sudah dapat dipelajari dari dashboard.</p>
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
                <strong>Gate sertifikat</strong>
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
                <h2>Sesi berikutnya</h2>
              </div>
              <Link to="/dashboard/classroom/schedule" className="student-inline-link">Buka jadwal</Link>
            </div>

            <div className="student-highlight-block">
              <h3>{schedulePreview.nextSession?.title || schedulePreview.nextSession?.topic || 'Belum ada sesi baru'}</h3>
              <p>{formatSessionTime(schedulePreview.nextSession?.startsAt || schedulePreview.nextSession?.scheduledAt || schedulePreview.nextSession?.date)}</p>
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
            </div>
          </article>
        ) : null}

        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Sertifikat</span>
              <h2>Checklist kelulusan</h2>
            </div>
            <Link to="/dashboard/sertifikat" className="student-inline-link">Buka gate</Link>
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
      </section>
    </div>
  );
}
