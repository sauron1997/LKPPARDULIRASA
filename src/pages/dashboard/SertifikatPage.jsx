import { Award, CheckCircle2, Download, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentDashboardData } from '../../hooks/student/useStudentDashboardData';
import './Dashboard.css';

function downloadFile(fileUrl, fileName) {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function SertifikatPage() {
  const { isReady, error, portal } = useStudentDashboardData();

  if (!isReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Memuat gate sertifikat...</h2>
          <p>Status syarat, evaluasi, dan file sertifikat sedang diproses.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Halaman sertifikat belum bisa dimuat</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!portal.student) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Data siswa belum ditemukan</h2>
          <p>Sertifikat belum bisa dicek karena akun ini belum terhubung ke data siswa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header">
        <div>
          <span className="student-section-eyebrow">Sertifikat</span>
          <h2>Gate kelayakan sertifikat</h2>
          <p className="dash-subtitle">Pantau syarat kelulusan sebelum dokumen sertifikat dibuka.</p>
        </div>
        <div className="student-section-badges">
          <span className={`student-status-chip ${portal.certificateGate.tone}`}>{portal.certificateGate.doneCount}/{portal.certificateGate.totalCount} syarat</span>
        </div>
      </section>

      <section className={`student-certificate-gate ${portal.certificateGate.tone}`}>
        <div className="student-certificate-copy">
          <div className="student-certificate-icon">
            {portal.certificateGate.downloadReady ? <ShieldCheck size={28} /> : <Award size={28} />}
          </div>
          <div>
            <h3>{portal.certificateGate.headline}</h3>
            <p>{portal.certificateGate.description}</p>
          </div>
        </div>
      </section>

      <section className="student-two-column">
        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Checklist</span>
              <h3>Syarat yang dicek sistem</h3>
            </div>
          </div>
          <div className="student-checklist compact">
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

        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Dokumen</span>
              <h3>Status file sertifikat</h3>
            </div>
          </div>

          {portal.certificate ? (
            <div className="student-certificate-card">
              <div className="student-certificate-card-head">
                <div className="student-certificate-seal"><Award size={24} /></div>
                <div>
                  <h4>{portal.certificate.program}</h4>
                  <p>NIS {portal.certificate.nis}</p>
                </div>
              </div>

              <div className="student-certificate-metadata">
                <div>
                  <span>Status</span>
                  <strong>{portal.certificate.status || 'available'}</strong>
                </div>
                <div>
                  <span>File</span>
                  <strong>{portal.certificate.fileName || 'Belum diunggah'}</strong>
                </div>
              </div>

              {portal.certificateGate.downloadReady ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => downloadFile(
                    portal.certificate.fileUrl,
                    portal.certificate.fileName || `${portal.certificate.program}.pdf`,
                  )}
                >
                  <Download size={16} /> Unduh Sertifikat
                </button>
              ) : (
                <div className="student-inline-notice">
                  {portal.certificateGate.eligible ? <CheckCircle2 size={18} /> : <Lock size={18} />}
                  <p>
                    {portal.certificateGate.eligible
                      ? 'Semua syarat sudah lulus. Menunggu admin mengunggah file akhir sertifikat.'
                      : 'Sertifikat akan aktif setelah seluruh syarat evaluasi dan penerbitan dokumen selesai.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="dash-empty">
              <Award size={48} />
              <h3>Sertifikat belum tersedia</h3>
              <p>Selesaikan checklist di sebelah kiri. Setelah admin menerbitkan dokumen, detail sertifikat akan muncul di sini.</p>
            </div>
          )}

          <div className="student-support-cta">
            <Link to="/dashboard/classroom/classwork" className="btn btn-outline">
              <CheckCircle2 size={16} /> Buka classroom
            </Link>
            <Link to="/dashboard/pesan" className="btn btn-ghost">
              <Award size={16} /> Hubungi admin
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
