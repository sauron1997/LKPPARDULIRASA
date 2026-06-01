import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import { usePaymentByEnrollment } from '../../hooks/payments/usePaymentQueries';
import './Pages.css';

const STATUS_MAP = {
  pending: { icon: Clock, label: 'Menunggu Pembayaran', className: 'status-pending', color: '#f59e0b' },
  paid: { icon: CheckCircle2, label: 'Pembayaran Berhasil', className: 'status-verified', color: '#10b981' },
  expired: { icon: AlertTriangle, label: 'Pembayaran Kadaluarsa', className: 'status-expired', color: '#ef4444' },
  failed: { icon: AlertTriangle, label: 'Pembayaran Gagal', className: 'status-failed', color: '#ef4444' },
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

export default function PaymentPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  const { data: payment, isLoading: paymentLoading, error: paymentError, refetch: refetchPayment } = usePaymentByEnrollment(enrollmentId);

  const paymentInfo = payment || {};

  const statusInfo = useMemo(() => {
    return STATUS_MAP[paymentInfo.status] || STATUS_MAP.pending;
  }, [paymentInfo.status]);

  const isTerminal = paymentInfo.status === 'paid' || paymentInfo.status === 'expired' || paymentInfo.status === 'failed';

  const handlePayNow = useCallback(() => {
    if (paymentInfo.redirectUrl) {
      window.open(paymentInfo.redirectUrl, '_blank');
    }
  }, [paymentInfo.redirectUrl]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  // Auto-redirect if payment is already paid
  useEffect(() => {
    if (paymentInfo.status === 'paid') {
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentInfo.status, navigate]);

  if (paymentLoading && !payment) {
    return (
      <div className="page-wrapper">
        <SEO title="Pembayaran" description="Memuat informasi pembayaran." />
        <div className="container section">
          <div className="auth-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader2 size={48} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
            <p>Memuat informasi pembayaran...</p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="page-wrapper">
        <SEO title="Pembayaran" description="Pembayaran tidak ditemukan." />
        <div className="container section">
          <div className="auth-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
            <h2>Pembayaran Tidak Ditemukan</h2>
            <p>{paymentError.message || 'Data pembayaran tidak tersedia.'}</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={() => refetchPayment()}>
                Coba Lagi
              </button>
              <Link to="/dashboard" className="btn btn-outline">
                Ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusInfo.icon;

  return (
    <div className="page-wrapper">
      <SEO title="Pembayaran" description="Selesaikan pembayaran kursus Anda." />
      <div className="page-hero">
        <div className="container">
          <h1>Pembayaran</h1>
          <p>Selesaikan pembayaran untuk mengaktifkan akses belajar Anda.</p>
        </div>
      </div>
      <div className="container section">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          {/* Status Banner */}
          <div
            className="payment-status-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: `${statusInfo.color}10`,
              border: `1.5px solid ${statusInfo.color}30`,
              marginBottom: '1.5rem',
            }}
          >
            <StatusIcon size={28} style={{ color: statusInfo.color, flexShrink: 0 }} />
            <div>
              <strong style={{ color: statusInfo.color, display: 'block', fontSize: '1rem' }}>{statusInfo.label}</strong>
              {paymentInfo.status === 'pending' && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Silakan lakukan pembayaran sebelum {paymentInfo.expiryAt ? formatDate(paymentInfo.expiryAt) : 'waktu habis'}
                </span>
              )}
              {paymentInfo.status === 'paid' && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Pembayaran telah dikonfirmasi pada {paymentInfo.paidAt ? formatDate(paymentInfo.paidAt) : '-'}
                </span>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="student-focus-list" style={{ marginBottom: '1.5rem' }}>
            <div className="student-focus-item">
              <CreditCard size={18} />
              <div>
                <strong>ID Pembayaran</strong>
                <p>{paymentInfo.id || '-'}</p>
              </div>
            </div>
            <div className="student-focus-item">
              <CreditCard size={18} />
              <div>
                <strong>Total Pembayaran</strong>
                <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-dark)' }}>
                  {formatPrice(paymentInfo.amount)}
                </p>
              </div>
            </div>
            <div className="student-focus-item">
              <CreditCard size={18} />
              <div>
                <strong>ID Pendaftaran</strong>
                <p>{enrollmentId || '-'}</p>
              </div>
            </div>
            {paymentInfo.status === 'paid' && paymentInfo.paymentMethod && (
              <div className="student-focus-item">
                <CreditCard size={18} />
                <div>
                  <strong>Metode Pembayaran</strong>
                  <p>{paymentInfo.paymentMethod}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="register-actions" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {paymentInfo.status === 'pending' && paymentInfo.redirectUrl && (
              <button type="button" className="btn btn-primary" onClick={handlePayNow} style={{ minWidth: 200 }}>
                <ExternalLink size={16} /> Bayar Sekarang
              </button>
            )}

            {paymentInfo.status === 'pending' && (
              <button type="button" className="btn btn-outline" onClick={() => refetchPayment()}>
                <Loader2 size={16} /> Periksa Status
              </button>
            )}

            {paymentInfo.status === 'paid' && (
              <button type="button" className="btn btn-primary" onClick={handleGoToDashboard}>
                <ArrowLeft size={16} /> Masuk Dashboard
              </button>
            )}

            {isTerminal && paymentInfo.status !== 'paid' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Pembayaran tidak dapat diproses. Silakan hubungi admin untuk bantuan.
                </p>
                <Link to="/contact" className="btn btn-outline">
                  Hubungi Admin
                </Link>
              </div>
            )}

            {paymentInfo.status === 'pending' && (
              <Link to="/dashboard" className="btn btn-outline" style={{ marginTop: '0.5rem' }}>
                Bayar Nanti
              </Link>
            )}
          </div>

          {/* Payment Instructions */}
          {paymentInfo.status === 'pending' && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                backgroundColor: 'var(--primary-50)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Cara Pembayaran:</strong>
              <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                <li>Klik tombol <strong>Bayar Sekarang</strong> untuk membuka halaman pembayaran Midtrans.</li>
                <li>Pilih metode pembayaran (QRIS, Bank Transfer, atau metode lainnya).</li>
                <li>Lakukan pembayaran sesuai petunjuk yang diberikan.</li>
                <li>Setelah pembayaran selesai, status akan berubah otomatis.</li>
                <li>Anda juga bisa klik <strong>Periksa Status</strong> untuk memperbarui status secara manual.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
