import { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, ExternalLink, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import {
  AdminEmptyState,
  AdminHero,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSectionCard,
  AdminTag,
  AdminToast,
} from '../../components/admin/AdminUi';
import {
  useManualPaymentsQuery,
  useRejectManualPaymentMutation,
  useVerifyManualPaymentMutation,
} from '../../hooks/payments/usePaymentQueries';

const STATUS_COPY = {
  pending: { label: 'Menunggu verifikasi', tone: 'amber' },
  paid: { label: 'Terverifikasi', tone: 'emerald' },
  failed: { label: 'Ditolak, menunggu upload ulang', tone: 'rose' },
  expired: { label: 'Kadaluarsa', tone: 'slate' },
};

function formatPrice(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminPaymentReviews() {
  const { data: payments = [], isLoading, error, refetch, isFetching } = useManualPaymentsQuery();
  const verifyMutation = useVerifyManualPaymentMutation();
  const rejectMutation = useRejectManualPaymentMutation();
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  const summary = useMemo(() => {
    return payments.reduce((result, payment) => {
      if (payment.status === 'paid') result.verified += 1;
      else if (payment.status === 'failed') result.rejected += 1;
      else result.pending += 1;
      return result;
    }, { pending: 0, verified: 0, rejected: 0 });
  }, [payments]);

  const handleVerify = async (payment) => {
    try {
      await verifyMutation.mutateAsync({
        paymentId: payment.id,
        payload: { reviewNote: 'Bukti pembayaran diverifikasi admin.' },
      });
      setToast({
        tone: 'emerald',
        title: 'Pembayaran terverifikasi',
        description: `${payment.studentName || 'Siswa'} sudah dibuka akses belajarnya.`,
      });
    } catch (err) {
      setToast({
        tone: 'rose',
        title: 'Verifikasi gagal',
        description: err.message || 'Terjadi kesalahan saat memverifikasi pembayaran.',
      });
    }
  };

  const handleReject = async (payment) => {
    try {
      await rejectMutation.mutateAsync({
        paymentId: payment.id,
        payload: { reviewNote: 'Bukti pembayaran ditolak admin.' },
      });
      setToast({
        tone: 'amber',
        title: 'Pembayaran ditolak',
        description: `${payment.studentName || 'Siswa'} ditandai perlu tindak lanjut dan bisa mengirim ulang bukti transfer.`,
      });
    } catch (err) {
      setToast({
        tone: 'rose',
        title: 'Penolakan gagal',
        description: err.message || 'Terjadi kesalahan saat menolak pembayaran.',
      });
    }
  };

  const actionPending = verifyMutation.isPending || rejectMutation.isPending;

  if (isLoading) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="spin mx-auto text-emerald-600" />
          <p className="mt-4 text-slate-500">Memuat pembayaran manual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Gagal memuat pembayaran manual"
          description={error.message || 'Tidak dapat mengambil data pembayaran manual.'}
          action={<AdminSecondaryButton onClick={() => refetch()}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={Banknote}
        title="Review Pembayaran Manual"
        description="Tinjau bukti transfer dari siswa, lalu verifikasi atau tolak pembayaran manual."
        actions={(
          <AdminSecondaryButton onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 size={16} className="spin" /> : <RefreshCcw size={16} />}
            Muat Ulang
          </AdminSecondaryButton>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700/70">Menunggu</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{summary.pending}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700/70">Terverifikasi</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.verified}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700/70">Ditolak</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700">{summary.rejected}</p>
          </div>
        </div>
      </AdminHero>

      <AdminSectionCard title="Bukti Transfer Masuk" description="Daftar pembayaran manual yang sudah memiliki bukti transfer.">
        {payments.length === 0 ? (
          <AdminEmptyState
            icon={Banknote}
            title="Belum ada bukti transfer"
            description="Bukti pembayaran manual yang dikirim siswa akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Program</th>
                  <th className="px-3 py-2">Jumlah</th>
                  <th className="px-3 py-2">Bukti</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const status = STATUS_COPY[payment.status] || STATUS_COPY.pending;
                  const canReview = payment.status === 'pending';

                  return (
                    <tr key={payment.id} className="rounded-2xl bg-white shadow-[0_12px_35px_-30px_rgba(15,23,42,0.35)]">
                      <td className="rounded-l-2xl border-y border-l border-slate-100 px-3 py-4 align-top">
                        <p className="font-semibold text-slate-800">{payment.studentName}</p>
                        <p className="mt-1 text-xs text-slate-500">{payment.studentEmail || payment.studentPhone || payment.enrollmentId}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{payment.id}</p>
                      </td>
                      <td className="border-y border-slate-100 px-3 py-4 align-top">
                        <p className="font-medium text-slate-700">{payment.program}</p>
                        <p className="mt-1 text-xs text-slate-500">Enrollment {payment.enrollmentId}</p>
                      </td>
                      <td className="border-y border-slate-100 px-3 py-4 align-top font-semibold text-slate-800">
                        {formatPrice(payment.amount)}
                      </td>
                      <td className="border-y border-slate-100 px-3 py-4 align-top">
                        <p className="text-xs text-slate-500">{formatDate(payment.manualSubmittedAt)}</p>
                        {payment.manualProofUrl ? (
                          <a
                            href={payment.manualProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          >
                            <ExternalLink size={13} />
                            Buka bukti
                          </a>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">Bukti tidak tersedia</p>
                        )}
                      </td>
                      <td className="border-y border-slate-100 px-3 py-4 align-top">
                        <AdminTag tone={status.tone}>{status.label}</AdminTag>
                        {payment.manualReviewNote ? <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">{payment.manualReviewNote}</p> : null}
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-slate-100 px-3 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          <AdminSecondaryButton
                            className="h-10 border-rose-100 text-rose-600 hover:border-rose-200 hover:text-rose-700"
                            onClick={() => handleReject(payment)}
                            disabled={!canReview || actionPending}
                          >
                            <XCircle size={15} />
                            Tolak
                          </AdminSecondaryButton>
                          <AdminPrimaryButton
                            className="h-10"
                            onClick={() => handleVerify(payment)}
                            disabled={!canReview || actionPending}
                          >
                            <CheckCircle2 size={15} />
                            Verifikasi
                          </AdminPrimaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
