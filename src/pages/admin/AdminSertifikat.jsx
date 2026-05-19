import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AdminConfirmDialog,
  AdminField,
  AdminHero,
  AdminInput,
  AdminLoadingState,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSectionCard,
  AdminSidebarPanel,
  AdminTag,
  AdminTextarea,
  AdminToast,
} from '../../components/admin/AdminUi';
import { useAssessmentProgress } from '../../hooks/admin/useAssessmentProgress';
import { useCertificates } from '../../hooks/admin/useCertificates';
import { useCourses } from '../../hooks/admin/useCourses';
import { useEnrollments } from '../../hooks/admin/useEnrollments';
import { useStudents } from '../../hooks/admin/useStudents';
import { buildCertificateGate } from '../../utils/domainRelations';

const MAX_CERTIFICATE_FILE_SIZE = 2.5 * 1024 * 1024;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File sertifikat gagal dibaca.'));
    reader.readAsDataURL(file);
  });
}

export default function AdminSertifikat() {
  const studentsDomain = useStudents();
  const enrollmentsDomain = useEnrollments();
  const assessmentsDomain = useAssessmentProgress();
  const certificatesDomain = useCertificates();
  const coursesDomain = useCourses();
  const [query, setQuery] = useState('');
  const [issueDate, setIssueDate] = useState(todayDate());
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });
  const fileInputRef = useRef(null);

  const isReady = [
    studentsDomain.isReady,
    enrollmentsDomain.isReady,
    assessmentsDomain.isReady,
    certificatesDomain.isReady,
    coursesDomain.isReady,
  ].every(Boolean);

  const error = [
    studentsDomain.error,
    enrollmentsDomain.error,
    assessmentsDomain.error,
    certificatesDomain.error,
    coursesDomain.error,
  ].find(Boolean) || '';

  const studentBundles = useMemo(
    () => studentsDomain.students.map((student) => {
      const enrollment = enrollmentsDomain.enrollments.find(
        (item) => item.id === student.enrollmentId || item.studentId === student.id,
      ) || null;
      const course = coursesDomain.courses.find(
        (item) => String(item.id) === String(enrollment?.courseId || student.courseId),
      ) || null;
      const assessments = assessmentsDomain.assessmentProgress.filter(
        (item) => item.enrollmentId === enrollment?.id,
      );
      const certificate = certificatesDomain.certificates.find(
        (item) => item.studentId === student.id || item.enrollmentId === enrollment?.id,
      ) || null;
      const gate = buildCertificateGate({
        paymentStatus: enrollment?.paymentStatus || student.paymentStatus,
        assessments,
        certificate,
      });

      return {
        student,
        enrollment,
        course,
        assessments,
        certificate,
        gate,
      };
    }),
    [
      assessmentsDomain.assessmentProgress,
      certificatesDomain.certificates,
      coursesDomain.courses,
      enrollmentsDomain.enrollments,
      studentsDomain.students,
    ],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const matchingStudents = normalizedQuery
    ? studentBundles.filter((bundle) => (
      `${bundle.student.nis} ${bundle.student.name} ${bundle.course?.title || ''}`
        .toLowerCase()
        .includes(normalizedQuery)
    ))
    : [];

  const exactMatchedStudent = normalizedQuery
    ? matchingStudents.find((bundle) => (
      [bundle.student.nis, bundle.student.name, bundle.course?.title || '']
        .some((value) => value.toLowerCase() === normalizedQuery)
    )) || null
    : null;

  const matchedStudent = exactMatchedStudent || (matchingStudents.length === 1 ? matchingStudents[0] : null);
  const hasAmbiguousQuery = normalizedQuery.length > 0 && !exactMatchedStudent && matchingStudents.length > 1;

  const certificateItems = useMemo(
    () => certificatesDomain.certificates
      .map((certificate) => ({ ...certificate }))
      .sort(
        (left, right) => new Date(right.updatedAt || right.issueDate || 0)
          - new Date(left.updatedAt || left.issueDate || 0),
      ),
    [certificatesDomain.certificates],
  );

  const selectedCertificate = certificateItems.find(
    (item) => String(item.id) === String(selectedCertificateId),
  ) || certificateItems[0] || null;

  const eligibleTotal = studentBundles.filter((bundle) => bundle.gate.eligible).length;
  const readyToUpload = studentBundles.filter(
    (bundle) => bundle.gate.eligible && !bundle.certificate,
  ).length;
  const hasQuery = query.trim().length > 0;

  const resetForm = () => {
    setQuery('');
    setIssueDate(todayDate());
    setNotes('');
    setSelectedFile(null);
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0] || null;

    if (file && file.size > MAX_CERTIFICATE_FILE_SIZE) {
      setSelectedFile(null);
      setToast({
        tone: 'rose',
        title: 'File terlalu besar',
        description: 'Ukuran file sertifikat maksimal 2.5 MB agar penyimpanan admin tetap stabil.',
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const saveCertificate = async (event) => {
    event.preventDefault();
    if (!matchedStudent || !matchedStudent.gate.eligible || !selectedFile) {
      return;
    }

    try {
      const fileUrl = await readFileAsDataUrl(selectedFile);
      const nextCertificate = {
        id: matchedStudent.certificate?.id || `cert-${matchedStudent.student.id}-${issueDate}`,
        studentId: matchedStudent.student.id,
        enrollmentId: matchedStudent.enrollment?.id || null,
        courseId: matchedStudent.course?.id || matchedStudent.student.courseId || null,
        nis: matchedStudent.student.nis,
        studentName: matchedStudent.student.name,
        program: matchedStudent.course?.title || matchedStudent.student.program,
        issueDate,
        status: 'available',
        fileName: selectedFile.name,
        fileUrl,
        mimeType: selectedFile.type,
        notes: notes.trim(),
        eligibilitySnapshot: {
          paymentStatus: matchedStudent.enrollment?.paymentStatus || matchedStudent.student.paymentStatus,
          assessments: matchedStudent.assessments,
        },
        updatedAt: new Date().toISOString(),
      };

      certificatesDomain.setCertificates((current) => {
        const exists = current.some((item) => String(item.id) === String(nextCertificate.id));

        return exists
          ? current.map((item) => (
            String(item.id) === String(nextCertificate.id) ? nextCertificate : item
          ))
          : [nextCertificate, ...current];
      });

      setSelectedCertificateId(nextCertificate.id);
      setToast({
        tone: 'emerald',
        title: matchedStudent.certificate ? 'Sertifikat diperbarui' : 'Sertifikat diunggah',
        description: 'Dokumen sertifikat kini terhubung ke checklist kelayakan siswa.',
      });
      resetForm();
    } catch (uploadError) {
      setToast({
        tone: 'rose',
        title: 'Upload gagal',
        description: uploadError.message || 'Terjadi masalah saat membaca file sertifikat.',
      });
    }
  };

  const deleteCertificate = () => {
    if (!confirmDeleteId) {
      return;
    }

    certificatesDomain.setCertificates((current) => (
      current.filter((item) => String(item.id) !== String(confirmDeleteId))
    ));

    if (String(selectedCertificateId) === String(confirmDeleteId)) {
      setSelectedCertificateId(null);
    }

    setConfirmDeleteId(null);
    setToast({
      tone: 'rose',
      title: 'Sertifikat dihapus',
      description: 'Record sertifikat telah dihapus dari dashboard admin.',
    });
  };

  if (!isReady) {
    return (
      <AdminLoadingState
        title="Memuat workspace sertifikat..."
        description="Data siswa, evaluasi, dan dokumen sertifikat sedang disiapkan."
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      <AdminHero
        icon={FileText}
        title="Workspace Sertifikat"
        description="Kelola upload, pembaruan, dan validasi sertifikat siswa berdasarkan pembayaran serta tiga checkpoint evaluasi."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
          <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Tersimpan</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{certificatesDomain.certificates.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Eligible</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{eligibleTotal}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Menunggu Upload</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{readyToUpload}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belum Lolos</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{studentBundles.length - eligibleTotal}</p>
          </div>
        </div>
      </AdminHero>

      {error ? (
        <AdminNotice
          tone="rose"
          title="Data sertifikat gagal dimuat"
          description={error}
          action={(
            <AdminSecondaryButton
              onClick={() => {
                studentsDomain.reload();
                enrollmentsDomain.reload();
                assessmentsDomain.reload();
                certificatesDomain.reload();
                coursesDomain.reload();
              }}
            >
              Coba lagi
            </AdminSecondaryButton>
          )}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <AdminSectionCard
          title="Upload atau Ganti Sertifikat"
          description="Cari siswa berdasarkan NIS atau nama, lalu unggah sertifikat setelah semua syarat selesai."
          bodyClassName="px-5 py-6 sm:px-6 lg:px-7"
        >
          <form onSubmit={saveCertificate} className="space-y-6">
            <AdminField label="Cari Siswa" helper="Berdasarkan NIS atau nama">
              <AdminInput
                icon={Search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Contoh: PRK-2026-003 atau nama siswa"
              />
            </AdminField>

            {matchedStudent ? (
              <div className="space-y-4 rounded-[24px] border border-emerald-100 bg-emerald-50/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{matchedStudent.student.name}</p>
                    <p className="mt-1 text-sm text-emerald-700/80">
                      {matchedStudent.student.nis}
                      {' • '}
                      {matchedStudent.course?.title || matchedStudent.student.program}
                    </p>
                  </div>
                  <AdminTag tone={matchedStudent.gate.eligible ? 'emerald' : 'amber'}>
                    {matchedStudent.gate.eligible ? 'Eligible' : 'Belum eligible'}
                  </AdminTag>
                </div>

                <div className="space-y-3 rounded-[20px] bg-white/75 p-4">
                  {matchedStudent.gate.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </div>
                      <AdminTag tone={item.done ? 'emerald' : 'slate'}>
                        {item.done ? <CheckCircle2 size={12} /> : null}
                        {item.done ? 'OK' : 'Belum'}
                      </AdminTag>
                    </div>
                  ))}
                </div>

                {!matchedStudent.gate.eligible ? (
                  <AdminNotice
                    tone="amber"
                    title="Siswa belum memenuhi syarat"
                    description="Lengkapi pembayaran dan tiga evaluasi terlebih dahulu di workspace data siswa."
                  />
                ) : null}
              </div>
            ) : (
              <AdminNotice
                tone={hasAmbiguousQuery || hasQuery ? 'amber' : 'slate'}
                title={
                  hasAmbiguousQuery
                    ? 'Hasil pencarian masih ambigu'
                    : hasQuery
                      ? 'Siswa tidak ditemukan'
                      : 'Siswa belum dipilih'
                }
                description={
                  hasAmbiguousQuery
                    ? 'Ketik NIS atau nama siswa yang lebih spesifik agar sertifikat tidak terpasang ke data yang salah.'
                    : hasQuery
                      ? 'Periksa kembali NIS, nama siswa, atau paket kursus yang diketik.'
                      : 'Masukkan NIS atau nama siswa untuk membuka checklist kelayakan sertifikat.'
                }
              />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminField label="Tanggal terbit">
                <AdminInput
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </AdminField>

              <AdminField
                label="File sertifikat"
                helper={selectedFile?.name || 'PDF, JPG, atau PNG'}
              >
                <label
                  role="button"
                  tabIndex={0}
                  className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-4 text-center transition-colors hover:border-emerald-200 hover:bg-emerald-50/35 focus-visible:border-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Pilih file sertifikat"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]">
                    <Upload size={20} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-800">
                    {selectedFile ? 'Ganti file sertifikat' : 'Pilih file sertifikat'}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    Maksimalkan nama file yang jelas agar mudah ditelusuri di daftar sertifikat.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                </label>
              </AdminField>
            </div>

            <AdminField label="Catatan admin" helper="Opsional">
              <AdminTextarea
                className="min-h-[110px] bg-slate-50"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Catatan internal atau keterangan file"
              />
            </AdminField>

            <div className="flex flex-wrap gap-3">
              <AdminPrimaryButton type="submit" disabled={!matchedStudent?.gate.eligible || !selectedFile}>
                <Upload size={18} />
                {matchedStudent?.certificate ? 'Perbarui Sertifikat' : 'Unggah Sertifikat'}
              </AdminPrimaryButton>
              <AdminSecondaryButton onClick={resetForm}>
                Reset Form
              </AdminSecondaryButton>
            </div>
          </form>
        </AdminSectionCard>

        <AdminSidebarPanel
          title="Daftar Sertifikat"
          description="Dokumen sertifikat yang sudah diunggah admin."
          action={<AdminTag tone="emerald">{certificateItems.length} dokumen</AdminTag>}
          contentClassName="mt-6 space-y-6"
        >
          {certificateItems.length === 0 ? (
            <AdminNotice
              tone="slate"
              title="Belum ada sertifikat"
              description="Setelah file pertama diunggah, daftar sertifikat akan muncul di panel ini."
            />
          ) : (
            <div className="space-y-3">
              {certificateItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCertificateId(item.id)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
                    String(selectedCertificate?.id) === String(item.id)
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-100 bg-slate-50/70 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.studentName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.program}</p>
                    </div>
                    <AdminTag tone="blue">{formatDate(item.issueDate)}</AdminTag>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedCertificate ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedCertificate.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedCertificate.fileName || 'Tanpa nama file'}</p>
                  </div>
                </div>
                <AdminSecondaryButton
                  className="h-10 w-10 px-0 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setConfirmDeleteId(selectedCertificate.id)}
                  aria-label="Hapus sertifikat"
                >
                  <Trash2 size={16} />
                </AdminSecondaryButton>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <AdminTag tone="blue">{formatDate(selectedCertificate.issueDate)}</AdminTag>
                <AdminTag tone="emerald">{selectedCertificate.status || 'available'}</AdminTag>
                {selectedCertificate.program ? <AdminTag>{selectedCertificate.program}</AdminTag> : null}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
                <p>
                  <strong className="text-slate-800">Program:</strong>
                  {' '}
                  {selectedCertificate.program}
                </p>
                <p className="mt-1">
                  <strong className="text-slate-800">Tanggal terbit:</strong>
                  {' '}
                  {formatDate(selectedCertificate.issueDate)}
                </p>
                <p className="mt-1">
                  <strong className="text-slate-800">Status:</strong>
                  {' '}
                  {selectedCertificate.status || 'available'}
                </p>
              </div>

              {selectedCertificate.notes ? (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Catatan admin</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{selectedCertificate.notes}</p>
                </div>
              ) : null}

              {selectedCertificate.fileUrl ? (
                <a
                  href={selectedCertificate.fileUrl}
                  download={selectedCertificate.fileName || `${selectedCertificate.program}.pdf`}
                  className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(5,150,105,0.8)] transition-colors hover:bg-emerald-700 hover:shadow-[0_24px_48px_-24px_rgba(5,150,105,0.85)]"
                >
                  <Download size={16} />
                  Unduh File
                </a>
              ) : null}
            </div>
          ) : null}
        </AdminSidebarPanel>
      </div>

      <AdminConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Hapus sertifikat ini?"
        description="Dokumen sertifikat akan dihapus dari daftar admin dan tidak lagi tersedia untuk siswa."
        confirmLabel="Hapus sertifikat"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={deleteCertificate}
      />

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
