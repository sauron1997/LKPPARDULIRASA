import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CreditCard,
  FileText,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import {
  AdminHero,
  AdminLoadingState,
  AdminNotice,
  AdminSearchInput,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSurface,
  AdminTag,
  AdminToast,
} from '../../components/admin/AdminUi';
import { useAdminLearningOpsData } from '../../hooks/admin/useAdminLearningOpsData';
import { useAssessmentProgress } from '../../hooks/admin/useAssessmentProgress';
import { useAssessmentSubmissions } from '../../hooks/admin/useAssessmentSubmissions';
import { getAssessmentStatusMeta } from '../../utils/domainRelations';

const TRIAGE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'review', label: 'Perlu Review' },
  { key: 'retry', label: 'Retry' },
  { key: 'not_started', label: 'Belum Mulai' },
  { key: 'certificate', label: 'Siap Sertifikat' },
  { key: 'payment', label: 'Pembayaran' },
];

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function AdminSiswa() {
  const learningOps = useAdminLearningOpsData();
  const assessmentsDomain = useAssessmentProgress();
  const submissionsDomain = useAssessmentSubmissions();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [triageFilter, setTriageFilter] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  const isReady = [
    learningOps.isReady,
    assessmentsDomain.isReady,
    submissionsDomain.isReady,
  ].every(Boolean);

  const error = [
    learningOps.error,
    assessmentsDomain.error,
    submissionsDomain.error,
  ].find(Boolean) || '';

  const bundles = useMemo(() => [...learningOps.classBundles]
    .sort((left, right) => new Date(right.student.registrationDate || 0) - new Date(left.student.registrationDate || 0)), [
    learningOps.classBundles,
  ]);

  const filteredBundles = useMemo(() => bundles.filter((bundle) => {
    const haystack = `${bundle.student.name} ${bundle.student.nis} ${bundle.student.email} ${bundle.course?.title || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(search.trim().toLowerCase());
    const paymentStatus = String(bundle.enrollment?.paymentStatus || bundle.student.paymentStatus);
    const matchesPayment = paymentFilter === 'all' || paymentStatus === paymentFilter;
    const matchesTriage = triageFilter === 'all'
      || (triageFilter === 'review' && bundle.reviewCount > 0)
      || (triageFilter === 'retry' && bundle.retryCount > 0)
      || (triageFilter === 'not_started' && bundle.notStartedCount > 0)
      || (triageFilter === 'certificate' && bundle.gate.eligible && !bundle.gate.downloadReady)
      || (triageFilter === 'payment' && paymentStatus !== 'verified');
    return matchesSearch && matchesPayment && matchesTriage;
  }), [bundles, paymentFilter, search, triageFilter]);

  const selectedBundle = filteredBundles.find((bundle) => String(bundle.student.id) === String(selectedStudentId))
    || filteredBundles[0]
    || null;

  const totalEligible = learningOps.stats.eligibleCertificateCount;
  const totalNeedsReview = learningOps.stats.reviewQueueCount;

  const updateDraft = (submissionId, field, value) => {
    setReviewDrafts((current) => ({
      ...current,
      [submissionId]: {
        status: current[submissionId]?.status || 'passed',
        score: current[submissionId]?.score || '',
        feedback: current[submissionId]?.feedback || '',
        [field]: value,
      },
    }));
  };

  const getDraft = (submission) => reviewDrafts[submission.id] || {
    status: submission.status === 'retry' ? 'retry' : submission.status,
    score: submission.score == null ? '' : String(submission.score),
    feedback: submission.feedback || submission.notes || '',
  };

  const saveReview = (bundle, submission) => {
    const draft = getDraft(submission);
    const reviewedAt = new Date().toISOString();
    const nextScore = draft.score === '' ? null : Number(draft.score);

    submissionsDomain.setAssessmentSubmissions((current) => current.map((item) => (
      String(item.id) === String(submission.id)
        ? {
          ...item,
          status: draft.status,
          score: nextScore,
          feedback: draft.feedback,
          notes: draft.feedback,
          reviewedAt,
          reviewerName: 'Admin LKP',
          updatedAt: reviewedAt,
        }
        : item
    )));

    assessmentsDomain.setAssessmentProgress((current) => {
      const existingRecord = current.find((item) => (
        String(item.enrollmentId) === String(bundle.enrollment?.id)
        && String(item.type || '').toLowerCase() === String(submission.type || '').toLowerCase()
      ));
      const nextRecord = {
        ...(existingRecord || {}),
        id: existingRecord?.id || `asg-${bundle.student.id}-${submission.type}`,
        enrollmentId: bundle.enrollment?.id || null,
        studentId: bundle.student.id,
        courseId: bundle.course?.id || bundle.student.courseId || null,
        type: submission.type,
        assessmentTitle: submission.title || submission.type,
        status: draft.status,
        score: nextScore,
        maxScore: submission.maxScore || existingRecord?.maxScore || 100,
        notes: draft.feedback,
        feedback: draft.feedback,
        submittedAt: submission.submittedAt || existingRecord?.submittedAt || reviewedAt,
        completedAt: draft.status === 'passed' ? reviewedAt : existingRecord?.completedAt || null,
        updatedAt: reviewedAt,
        createdAt: existingRecord?.createdAt || reviewedAt,
      };

      const filtered = current.filter((item) => String(item.id) !== String(nextRecord.id));
      return [nextRecord, ...filtered];
    });

    setToast({
      tone: draft.status === 'passed' ? 'emerald' : draft.status === 'retry' ? 'rose' : 'blue',
      title: 'Review submission disimpan',
      description: `${bundle.student.name} sekarang berstatus ${draft.status === 'passed' ? 'lulus' : draft.status === 'retry' ? 'perlu ulang' : 'menunggu review'} pada ${submission.type}.`,
    });
  };

  if (!isReady) {
    return <AdminLoadingState title="Memuat data siswa..." description="Record siswa, progres evaluasi, dan submission sedang disiapkan." />;
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      <AdminHero
        icon={UserRound}
        title="Workspace Data Siswa"
        description="Pantau identitas siswa, tiga checkpoint evaluasi, dan review submission latihan, teori, serta praktik dari satu area kerja."
        actions={(
          <AdminSecondaryButton
            onClick={() => {
              learningOps.reload();
            }}
          >
            Muat Ulang Data
          </AdminSecondaryButton>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
          <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total Siswa</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{bundles.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Submission Review</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalNeedsReview}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Siap Sertifikat</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalEligible}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Perlu Tindak Lanjut</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{bundles.length - totalEligible}</p>
          </div>
        </div>
      </AdminHero>

      {error ? (
        <AdminNotice
          tone="rose"
          title="Workspace siswa gagal dimuat"
          description={error}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.9fr)]">
        <AdminSurface className="overflow-hidden p-0">
          <div className="space-y-4 border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <AdminSearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, NIS, email, atau program..." />
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="all">Semua pembayaran</option>
                <option value="verified">Terverifikasi</option>
                <option value="pending">Pending</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TRIAGE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTriageFilter(filter.key)}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${triageFilter === filter.key ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-700'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredBundles.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">Belum ada data siswa yang cocok dengan filter ini.</div>
            ) : (
              filteredBundles.map((bundle) => {
                const paymentStatus = bundle.enrollment?.paymentStatus || bundle.student.paymentStatus || 'pending';
                const pendingReviewCount = bundle.submissions.filter((item) => item.status === 'in_review').length;
                const retryCount = bundle.retryCount;

                return (
                  <button
                    key={bundle.student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(bundle.student.id)}
                    className={`flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-emerald-50/40 sm:px-6 ${String(selectedBundle?.student.id) === String(bundle.student.id) ? 'bg-emerald-50/70' : 'bg-white'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{bundle.student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{bundle.student.nis} • {bundle.course?.title || bundle.student.program}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AdminTag tone={paymentStatus === 'verified' ? 'emerald' : paymentStatus === 'rejected' ? 'rose' : 'amber'}>
                          {paymentStatus === 'verified' ? 'Pembayaran valid' : paymentStatus === 'rejected' ? 'Pembayaran ditolak' : 'Pembayaran pending'}
                        </AdminTag>
                        <AdminTag tone={pendingReviewCount > 0 ? 'amber' : 'blue'}>
                          {pendingReviewCount > 0 ? `${pendingReviewCount} review aktif` : 'Review aman'}
                        </AdminTag>
                        <AdminTag tone={retryCount > 0 ? 'rose' : 'slate'}>
                          {retryCount > 0 ? `${retryCount} retry` : `${bundle.portal.learning.completionPercent}% kelas`}
                        </AdminTag>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-3">
                      <span>Modul: {bundle.activeModuleTitle}</span>
                      <span>Submission: {bundle.submissions.length}</span>
                      <span>Daftar: {formatDate(bundle.student.registrationDate)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6 lg:p-7">
          {selectedBundle ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{selectedBundle.student.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedBundle.student.nis} • {selectedBundle.course?.title || selectedBundle.student.program}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kontak</p>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Mail size={16} /> {selectedBundle.student.email}</p>
                    <p className="flex items-center gap-2"><Phone size={16} /> {selectedBundle.student.phone}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status belajar</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminTag tone={(selectedBundle.enrollment?.paymentStatus || selectedBundle.student.paymentStatus) === 'verified' ? 'emerald' : (selectedBundle.enrollment?.paymentStatus || selectedBundle.student.paymentStatus) === 'rejected' ? 'rose' : 'amber'}>
                      <CreditCard size={12} />
                      {(selectedBundle.enrollment?.paymentStatus || selectedBundle.student.paymentStatus) === 'verified' ? 'Pembayaran valid' : (selectedBundle.enrollment?.paymentStatus || selectedBundle.student.paymentStatus) === 'rejected' ? 'Pembayaran ditolak' : 'Pembayaran pending'}
                    </AdminTag>
                    <AdminTag tone={selectedBundle.gate.eligible ? 'blue' : 'slate'}>
                      <Award size={12} />
                      {selectedBundle.gate.eligible ? 'Siap sertifikat' : 'Belum siap'}
                    </AdminTag>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Ringkasan Kelas Saya</p>
                    <p className="mt-1 text-xs text-slate-500">Snapshot yang sama dengan workspace belajar siswa.</p>
                  </div>
                  <AdminTag tone={selectedBundle.portal.hasFullDownloadAccess ? 'emerald' : 'amber'}>
                    {selectedBundle.portal.hasFullDownloadAccess ? 'Akses penuh' : 'Akses bertahap'}
                  </AdminTag>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Progress kelas</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedBundle.portal.learning.completionPercent}%</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedBundle.portal.learning.completedModules}/{selectedBundle.portal.learning.totalModules} modul selesai</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modul aktif</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedBundle.portal.learning.currentModule?.title || 'Belum ada modul aktif'}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedBundle.portal.learning.currentModule?.summary || 'Admin belum menambahkan ringkasan modul.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tugas berikutnya</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedBundle.portal.nextActionableActivity?.label || 'Pantau update kelas'}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedBundle.portal.nextActionableActivity?.definition?.title || 'Tidak ada aktivitas aktif yang perlu dikerjakan.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gate sertifikat</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedBundle.gate.doneCount}/{selectedBundle.gate.totalCount} syarat</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedBundle.gate.headline}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Checklist sertifikat</p>
                <div className="mt-4 space-y-3">
                  {selectedBundle.gate.checklist.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </div>
                      <AdminTag tone={item.done ? 'emerald' : 'slate'}>{item.done ? 'OK' : 'Belum'}</AdminTag>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Progress evaluasi</p>
                <div className="mt-4 space-y-3">
                  {selectedBundle.portal.assessmentActivities.map((activity) => {
                    const record = activity.progress;
                    const meta = getAssessmentStatusMeta(record?.status);

                    return (
                      <div key={activity.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <BookOpen size={16} />
                            {activity.label}
                          </div>
                          <AdminTag tone={meta.tone === 'success' ? 'emerald' : meta.tone === 'danger' ? 'rose' : meta.tone === 'warning' ? 'amber' : meta.tone === 'info' ? 'blue' : 'slate'}>
                            {meta.label}
                          </AdminTag>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{record?.notes || 'Belum ada catatan evaluasi.'}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                          <span>Nilai: {record?.score ?? activity.latestSubmission?.score ?? '-'}/100</span>
                          <span>Submission: {activity.relatedSubmissions.length}</span>
                          <span>{activity.definition ? `${activity.questionCount} item aktif` : 'Definition belum publish'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Review submission siswa</p>
                  <AdminTag tone={selectedBundle.submissions.some((item) => item.status === 'in_review') ? 'amber' : 'slate'}>
                    {selectedBundle.submissions.length} submission
                  </AdminTag>
                </div>

                <div className="mt-4 space-y-4">
                  {selectedBundle.submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                      Belum ada submission yang masuk dari siswa ini.
                    </div>
                  ) : (
                    selectedBundle.submissions.map((submission) => {
                      const draft = getDraft(submission);
                      const fileMeta = {
                        fileName: submission.fileName,
                        fileUrl: submission.fileUrl,
                        fileSizeLabel: submission.fileSizeLabel,
                      };
                      const activity = selectedBundle.portal.assessmentActivities.find((item) => item.key === String(submission.type || '').toLowerCase());
                      const questions = activity?.definition?.questions || [];

                      return (
                        <div key={submission.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{submission.title}</p>
                              <p className="mt-1 text-xs text-slate-500">Dikirim {formatDate(submission.submittedAt)} • Tipe {submission.type}</p>
                            </div>
                            <AdminTag tone={submission.status === 'passed' ? 'emerald' : submission.status === 'retry' ? 'rose' : submission.status === 'in_review' ? 'amber' : 'blue'}>
                              {submission.status === 'passed' ? 'Lulus' : submission.status === 'retry' ? 'Perlu ulang' : submission.status === 'in_review' ? 'Menunggu review' : 'Draft aktif'}
                            </AdminTag>
                          </div>

                          {fileMeta.fileName ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{fileMeta.fileName}</p>
                                <p className="mt-1 text-xs text-slate-500">{fileMeta.fileSizeLabel || 'File praktik tersimpan pada demo frontend ini.'}</p>
                              </div>
                              {fileMeta.fileUrl ? (
                                <a href={fileMeta.fileUrl} download={fileMeta.fileName} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.3)] transition-colors hover:border-emerald-200 hover:text-emerald-700">
                                  <FileText size={16} />
                                  Lihat File
                                </a>
                              ) : null}
                            </div>
                          ) : null}

                          {questions.length ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">Jawaban siswa</p>
                              <div className="mt-3 space-y-3">
                                {questions.map((question, questionIndex) => {
                                  const rawAnswer = submission.answers?.[question.id] ?? '';
                                  const matchedOption = Array.isArray(question.options)
                                    ? question.options.find((option) => String(option.value || option.id) === String(rawAnswer))
                                    : null;
                                  const answerLabel = matchedOption?.label || rawAnswer || '-';

                                  return (
                                    <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Soal {questionIndex + 1}</p>
                                        <AdminTag tone={question.kind === 'multiple_choice' ? 'blue' : 'slate'}>
                                          {question.kind === 'multiple_choice' ? 'Pilihan ganda' : 'Essay'}
                                        </AdminTag>
                                      </div>
                                      <p className="mt-2 text-sm font-medium text-slate-800">{question.prompt}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-600">{answerLabel}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[140px_140px_1fr]">
                            <label className="space-y-2 text-sm font-medium text-slate-700">
                              <span>Status review</span>
                              <select
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                value={draft.status}
                                onChange={(event) => updateDraft(submission.id, 'status', event.target.value)}
                              >
                                <option value="in_review">Menunggu review</option>
                                <option value="passed">Lulus</option>
                                <option value="retry">Perlu ulang</option>
                              </select>
                            </label>
                            <label className="space-y-2 text-sm font-medium text-slate-700">
                              <span>Nilai</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                value={draft.score}
                                onChange={(event) => updateDraft(submission.id, 'score', event.target.value)}
                                placeholder="0-100"
                              />
                            </label>
                            <label className="space-y-2 text-sm font-medium text-slate-700">
                              <span>Feedback admin</span>
                              <textarea
                                className="min-h-[96px] w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                value={draft.feedback}
                                onChange={(event) => updateDraft(submission.id, 'feedback', event.target.value)}
                                placeholder="Catatan review untuk siswa"
                              />
                            </label>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <AdminPrimaryButton onClick={() => saveReview(selectedBundle, submission)}>
                              Simpan Review
                            </AdminPrimaryButton>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4 text-sm text-slate-500">
                <p>Terdaftar pada {formatDate(selectedBundle.student.registrationDate)}.</p>
                <p className="mt-1">Status akun login: {selectedBundle.account?.status || 'active'}.</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
              Pilih siswa dari daftar kiri untuk melihat detailnya.
            </div>
          )}
        </AdminSurface>
      </div>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
