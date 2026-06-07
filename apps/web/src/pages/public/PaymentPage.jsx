import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Building2, CreditCard, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Clock, Copy, FileCheck2, Upload } from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import { usePaymentByEnrollmentWithAccess, useUploadPaymentProofMutation } from '../../hooks/payments/usePaymentQueries';
import { usePaymentSettings } from '../../hooks/paymentSettings/usePaymentSettings';
import './Pages.css';

const MAX_PROOF_FILE_SIZE = 2.5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = () => reject(new Error('File bukti pembayaran gagal dibaca.'));
    reader.readAsDataURL(file);
  });
}

export default function PaymentPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentAccessToken = searchParams.get('token') || '';
  const isLegacyPaymentLink = !paymentAccessToken;

  const { data: payment, isLoading: paymentLoading, error: paymentError, refetch: refetchPayment } = usePaymentByEnrollmentWithAccess(enrollmentId, paymentAccessToken);
  const { data: manualSettings } = usePaymentSettings();
  const uploadProofMutation = useUploadPaymentProofMutation();
  const [proofFile, setProofFile] = useState(null);
  const [proofDataUrl, setProofDataUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [proofSuccess, setProofSuccess] = useState('');

  const paymentInfo = payment || {};
  const isManualProofSubmitted = paymentInfo.paymentChannel === 'manual_transfer' && Boolean(paymentInfo.manualSubmittedAt);
  const isManualReviewPending = paymentInfo.status === 'pending' && isManualProofSubmitted;
  const isManualReviewRejected = paymentInfo.status === 'failed' && paymentInfo.paymentChannel === 'manual_transfer' && Boolean(paymentInfo.manualSubmittedAt);
  const canUploadManualProof = ((paymentInfo.status === 'pending' || paymentInfo.status === 'expired') && !isManualReviewPending) || isManualReviewRejected;
  const shouldShowManualPaymentSection = manualSettings?.hasManualPayment && (paymentInfo.status === 'pending' || paymentInfo.status === 'expired' || isManualReviewRejected);

  const statusInfo = useMemo(() => {
    return STATUS_MAP[paymentInfo.status] || STATUS_MAP.pending;
  }, [paymentInfo.status]);

  const isTerminal = paymentInfo.status === 'paid' || paymentInfo.status === 'expired' || paymentInfo.status === 'failed';
  const paymentErrorMessage = paymentError?.message || 'Data pembayaran tidak tersedia.';

  const handlePayNow = useCallback(() => {
    if (paymentInfo.redirectUrl) {
      window.open(paymentInfo.redirectUrl, '_blank');
    }
  }, [paymentInfo.redirectUrl]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleProofChange = useCallback(async (event) => {
    if (!canUploadManualProof) {
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    setProofError('');
    setProofSuccess('');
    setProofFile(null);
    setProofDataUrl('');

    if (!file) return;

    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setProofError('File bukti pembayaran harus berupa gambar atau PDF.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE) {
      setProofError('Ukuran file bukti pembayaran maksimal 2.5 MB.');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProofFile(file);
      setProofDataUrl(dataUrl);
    } catch (err) {
      setProofError(err.message || 'File bukti pembayaran gagal dibaca.');
      event.target.value = '';
    }
  }, [canUploadManualProof]);

  const handleSubmitProof = useCallback(async () => {
    if (!canUploadManualProof) {
      setProofError(isManualReviewPending
        ? 'Bukti transfer Anda sedang ditinjau admin. Upload ulang akan dibuka jika pembayaran ditolak.'
        : 'Upload bukti transfer belum tersedia untuk status pembayaran ini.');
      return;
    }

    if (!paymentInfo.id || !proofDataUrl || !proofFile) {
      setProofError('Pilih file bukti pembayaran terlebih dahulu.');
      return;
    }

    setProofError('');
    setProofSuccess('');

    try {
      await uploadProofMutation.mutateAsync({
        paymentId: paymentInfo.id,
        enrollmentId,
        accessToken: paymentAccessToken,
        payload: {
          accessToken: paymentAccessToken,
          proofDataUrl,
          proofFileName: proofFile.name,
          referenceNote: '',
        },
      });
      setProofSuccess('Bukti pembayaran terkirim. Admin akan memverifikasi pembayaran Anda.');
      setProofFile(null);
      setProofDataUrl('');
      await refetchPayment();
    } catch (err) {
      setProofError(err.message || 'Bukti pembayaran gagal dikirim. Coba lagi.');
    }
  }, [canUploadManualProof, enrollmentId, isManualReviewPending, paymentAccessToken, paymentInfo.id, proofDataUrl, proofFile, refetchPayment, uploadProofMutation]);

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
        <SEO
          title={isLegacyPaymentLink ? 'Tautan Pembayaran Perlu Diperbarui' : 'Pembayaran tidak ditemukan'}
          description="Pembayaran tidak dapat dimuat."
        />
        <div className="container section">
          <div className="auth-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
            <h2>{isLegacyPaymentLink ? 'Tautan Pembayaran Perlu Diperbarui' : 'Pembayaran Tidak Ditemukan'}</h2>
            <p>{paymentErrorMessage}</p>
            {isLegacyPaymentLink ? (
              <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Tautan lama tanpa token keamanan tidak lagi bisa dipakai untuk akses publik. Masuk ke dashboard siswa
                atau gunakan tautan pembayaran terbaru dari admin.
              </p>
            ) : null}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={() => refetchPayment()}>
                Coba Lagi
              </button>
              <Link to="/dashboard" className="btn btn-outline">
                Ke Dashboard
              </Link>
              {isLegacyPaymentLink ? (
                <Link to="/contact" className="btn btn-outline">
                  Hubungi Admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusInfo.icon;
  const manualProofViewerUrl = paymentInfo.manualProofUrl
    ? `${paymentInfo.manualProofUrl}${paymentAccessToken ? `?token=${encodeURIComponent(paymentAccessToken)}` : ''}`
    : '';

  const manualUploadHelperText = isManualReviewRejected
    ? 'Bukti sebelumnya ditolak. Upload ulang bukti transfer terbaru agar admin dapat meninjau kembali pembayaran Anda.'
    : paymentInfo.status === 'expired'
      ? 'Pembayaran otomatis sudah kadaluarsa. Anda masih bisa mengirim bukti transfer manual untuk ditinjau admin.'
      : 'Upload bukti transfer agar admin dapat memverifikasi pembayaran Anda. Format: JPG, PNG, WEBP, atau PDF (maks. 2.5 MB).';

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
              <strong style={{ color: statusInfo.color, display: 'block', fontSize: '1rem' }}>
                {isManualProofSubmitted && paymentInfo.status === 'pending' ? 'Menunggu Verifikasi Admin' : statusInfo.label}
              </strong>
                {(paymentInfo.status === 'pending' || paymentInfo.status === 'expired') && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {isManualProofSubmitted
                      ? `Bukti transfer diterima pada ${formatDate(paymentInfo.manualSubmittedAt)}.`
                    : `Silakan lakukan pembayaran sebelum ${paymentInfo.expiryAt ? formatDate(paymentInfo.expiryAt) : 'waktu habis'}`}
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

             {isTerminal && paymentInfo.status !== 'paid' && !isManualReviewRejected && (
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

          {/* Manual Payment Instructions */}
          {shouldShowManualPaymentSection && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '14px',
                border: '1.5px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Banknote size={20} style={{ color: '#16a34a' }} />
                <strong style={{ color: '#166534', fontSize: '0.95rem' }}>Transfer Manual</strong>
              </div>

              {manualSettings.qrisImageUrl && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Scan kode QRIS berikut:
                  </p>
                  <img
                    src={manualSettings.qrisImageUrl}
                    alt="QRIS"
                    style={{
                      maxWidth: 220,
                      maxHeight: 220,
                      borderRadius: 12,
                      border: '2px solid #dcfce7',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              {manualSettings.bankName && manualSettings.accountNumber && (
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                    marginBottom: '0.75rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Building2 size={15} style={{ color: '#475569', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      {manualSettings.bankName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em' }}>
                      {manualSettings.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(manualSettings.accountNumber).catch(() => {});
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.7rem',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        color: '#475569',
                      }}
                    >
                      <Copy size={13} /> Salin
                    </button>
                  </div>
                  {manualSettings.accountHolderName && (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                      a.n. {manualSettings.accountHolderName}
                    </p>
                  )}
                </div>
              )}

              {manualSettings.paymentNotes && (
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#475569',
                    lineHeight: 1.6,
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem', color: '#334155', fontSize: '0.83rem' }}>
                    Catatan:
                  </strong>
                  {manualSettings.paymentNotes}
                </div>
              )}

              <div
                style={{
                  marginTop: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: '0.9rem 1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <FileCheck2 size={16} style={{ color: '#16a34a' }} />
                  <strong style={{ fontSize: '0.86rem', color: '#334155' }}>Upload Bukti Transfer</strong>
                </div>
                {isManualReviewPending && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: '#16a34a', lineHeight: 1.6 }}>
                    Bukti transfer sudah dikirim pada {formatDate(paymentInfo.manualSubmittedAt)} dan sedang menunggu verifikasi admin.
                  </p>
                )}
                {isManualReviewRejected && (
                  <div
                    style={{
                      marginBottom: '0.75rem',
                      borderRadius: 10,
                      border: '1px solid #fecaca',
                      backgroundColor: '#fff1f2',
                      padding: '0.75rem 0.85rem',
                    }}
                  >
                    <p style={{ fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.6 }}>
                      Bukti transfer sebelumnya ditolak pada {formatDate(paymentInfo.manualReviewedAt)}.
                    </p>
                    {paymentInfo.manualReviewNote ? (
                      <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#9f1239', lineHeight: 1.6 }}>
                        Catatan admin: {paymentInfo.manualReviewNote}
                      </p>
                    ) : null}
                  </div>
                )}
                {manualProofViewerUrl && (
                  <a
                    href={manualProofViewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}
                  >
                    Lihat bukti yang terkirim
                  </a>
                )}
                <p style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
                  {manualUploadHelperText}
                </p>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minHeight: 48,
                    border: '1.5px dashed #bbf7d0',
                    borderRadius: 12,
                    backgroundColor: '#f8fafc',
                    cursor: canUploadManualProof ? 'pointer' : 'not-allowed',
                    color: canUploadManualProof ? '#166534' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    opacity: canUploadManualProof ? 1 : 0.8,
                  }}
                >
                  <Upload size={16} />
                  {canUploadManualProof
                    ? (proofFile ? proofFile.name : isManualReviewRejected ? 'Pilih bukti transfer terbaru' : 'Pilih file bukti transfer')
                    : 'Upload dinonaktifkan saat bukti sedang direview'}
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleProofChange}
                    disabled={!canUploadManualProof}
                    style={{ display: 'none' }}
                  />
                </label>
                {proofError && <p style={{ marginTop: '0.6rem', color: '#dc2626', fontSize: '0.8rem' }}>{proofError}</p>}
                {proofSuccess && <p style={{ marginTop: '0.6rem', color: '#16a34a', fontSize: '0.8rem' }}>{proofSuccess}</p>}
                {canUploadManualProof ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitProof}
                    disabled={!canUploadManualProof || !proofDataUrl || uploadProofMutation.isPending}
                    style={{ marginTop: '0.85rem', width: '100%', justifyContent: 'center' }}
                  >
                    {uploadProofMutation.isPending ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                    {uploadProofMutation.isPending ? 'Mengirim bukti...' : isManualReviewRejected ? 'Kirim Ulang Bukti Transfer' : 'Kirim Bukti Transfer'}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Payment Instructions (Midtrans) */}
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
