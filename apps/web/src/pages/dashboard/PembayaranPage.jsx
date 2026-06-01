import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useStudentDashboardData } from '../../hooks/student/useStudentDashboardData';
import { usePaymentsByStudent } from '../../hooks/payments/usePaymentQueries';
import './Dashboard.css';

const STATUS_MAP = {
  pending: { icon: Clock, label: 'Menunggu', className: 'status-pending', color: '#f59e0b' },
  paid: { icon: CheckCircle2, label: 'Lunas', className: 'status-verified', color: '#10b981' },
  expired: { icon: AlertTriangle, label: 'Kadaluarsa', className: 'status-expired', color: '#ef4444' },
  failed: { icon: AlertTriangle, label: 'Gagal', className: 'status-failed', color: '#ef4444' },
};

function formatPrice(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function PembayaranPage() {
  const { portal, isReady: portalReady, error: portalError } = useStudentDashboardData();
  const studentId = portalReady && portal.student ? portal.student.id : null;
  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = usePaymentsByStudent(studentId);

  const sortedPayments = useMemo(() => {
    return [...(payments || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [payments]);

  if (!portalReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Memuat data pembayaran...</h2>
          <p>Riwayat pembayaran Anda sedang disiapkan.</p>
        </div>
      </div>
    );
  }

  if (portalError) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Data belum bisa dimuat</h2>
          <p>{portalError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header">
        <div>
          <span className="student-section-eyebrow">Pembayaran</span>
          <h2>Riwayat Pembayaran</h2>
          <p className="dash-subtitle">Pantau status pembayaran kursus Anda.</p>
        </div>
        <div className="student-section-badges">
          <span className="student-pill muted">NIS {portal.student?.nis || '-'}</span>
        </div>
      </section>

      {/* Summary Card */}
      <section className="student-two-column" style={{ marginBottom: '1.5rem' }}>
        <div className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Ringkasan</span>
              <h3>Status Pembayaran Terkini</h3>
            </div>
          </div>
          <div className="student-focus-list">
            <div className="student-focus-item">
              <CreditCard size={18} />
              <div>
                <strong>Program Kursus</strong>
                <p>{portal.course?.title || portal.student?.program || '-'}</p>
              </div>
            </div>
            <div className="student-focus-item">
              <CreditCard size={18} />
              <div>
                <strong>Status Pembayaran</strong>
                <p>
                  <span className={`student-status-chip ${portal.enrollment?.paymentStatus || 'pending'}`}>
                    {portal.enrollment?.paymentStatus === 'verified' ? 'Lunas' : portal.enrollment?.paymentStatus === 'rejected' ? 'Perlu Tindak Lanjut' : 'Menunggu'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment History */}
      <section className="student-panel-card">
        <div className="student-panel-heading">
          <div>
            <span className="student-section-eyebrow">Histori</span>
            <h3>Riwayat Transaksi</h3>
          </div>
          {paymentsLoading && <Loader2 size={18} className="spin" />}
        </div>

        {paymentsError ? (
          <div className="dash-state-card" style={{ margin: 0 }}>
            <p style={{ color: '#ef4444' }}>{paymentsError.message || 'Gagal memuat data pembayaran.'}</p>
            <button type="button" className="btn btn-outline" onClick={() => refetchPayments()} style={{ marginTop: '0.75rem' }}>
              Coba Lagi
            </button>
          </div>
        ) : sortedPayments.length === 0 ? (
          <div className="dash-state-card" style={{ margin: 0 }}>
            <CreditCard size={32} style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Belum ada riwayat pembayaran.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', minWidth: 600 }}>
              <thead>
                <tr>
                  <th>ID Pembayaran</th>
                  <th>Tanggal</th>
                  <th>Jumlah</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => {
                  const statusInfo = STATUS_MAP[payment.status] || STATUS_MAP.pending;
                  const StatusIcon = statusInfo.icon;
                  const isPending = payment.status === 'pending';
                  return (
                    <tr key={payment.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{payment.id}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatDate(payment.createdAt)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatPrice(payment.amount)}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {payment.paymentMethod || '-'}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            backgroundColor: `${statusInfo.color}15`,
                            color: statusInfo.color,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        {isPending && payment.redirectUrl ? (
                          <a
                            href={payment.redirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '4px 10px' }}
                          >
                            <ExternalLink size={14} /> Bayar
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
