import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Download,
  FileText,
  Lock,
  MessageSquare,
  PlayCircle,
  Save,
  Send,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitStudentAssessmentMutation } from '../../hooks/student/useStudentMutations';
import { useStudentClassroomData } from '../../hooks/student/useStudentClassroomData';
import {
  createStudentAssessmentAsset,
  revokeStudentAssessmentAssetUrl,
} from '../../services/student/studentClient';
import { getStudentActivityAvailability } from '../../utils/domainRelations';
import './Dashboard.css';

const CLASSROOM_TABS = [
  { key: 'stream', label: 'Stream' },
  { key: 'classwork', label: 'Classwork' },
  { key: 'grades', label: 'Grades' },
  { key: 'people', label: 'People' },
];

const PRACTICE_UPLOAD_LIMIT = 2 * 1024 * 1024;
const EMPTY_PRACTICE_UPLOAD_STATE = {
  assetUrl: '',
  fileName: '',
  fileSizeLabel: '',
  mimeType: '',
  error: '',
};

function downloadFile(fileUrl, fileName) {
  if (!fileUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function formatPaymentLabel(status) {
  if (status === 'verified') return 'Terverifikasi';
  if (status === 'rejected') return 'Perlu Tindak Lanjut';
  return 'Menunggu Verifikasi';
}

function formatDateLabel(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatBytes(value) {
  if (!value) return '0 KB';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatAllowedExtensions(extensions) {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    return 'Sesuai instruksi kelas';
  }

  return extensions.join(', ');
}

function getQuestionCount(definition) {
  return Array.isArray(definition?.questions) ? definition.questions.length : 0;
}

function calculateAutoScore(definition, answers) {
  const questions = Array.isArray(definition?.questions) ? definition.questions : [];
  const multipleChoiceQuestions = questions.filter((item) => item.kind === 'multiple_choice');
  const essayQuestions = questions.filter((item) => item.kind === 'essay');

  if (!multipleChoiceQuestions.length) {
    return {
      autoScore: null,
      score: null,
      hasEssay: essayQuestions.length > 0,
    };
  }

  const correctCount = multipleChoiceQuestions.filter((question) => {
    const answer = answers?.[question.id];
    const correctOption = Array.isArray(question.options)
      ? question.options.find((item) => String(item.id) === String(question.correctOptionId))
      : null;
    const correctValue = question.answer || correctOption?.value || correctOption?.id || question.correctOptionId || '';
    return String(answer || '') === String(correctValue || '');
  }).length;

  const autoScore = Math.round((correctCount / multipleChoiceQuestions.length) * 100);
  return {
    autoScore,
    score: autoScore,
    hasEssay: essayQuestions.length > 0,
  };
}

function buildProgressNotes(activityKey, payload) {
  if (activityKey === 'praktik') {
    return payload.notes || 'File praktik sudah dikirim dan menunggu review admin.';
  }

  if (payload.hasEssay) {
    return `Skor pilihan ganda tersimpan ${payload.autoScore ?? 0}/100. Menunggu review jawaban essay oleh admin.`;
  }

  if (payload.status === 'passed') {
    return `Aktivitas lulus dengan skor ${payload.score ?? 0}/100.`;
  }

  if (payload.status === 'retry') {
    return `Skor ${payload.score ?? 0}/100 belum memenuhi batas lulus. Silakan ulangi pengerjaan.`;
  }

  return payload.notes || '';
}

function getNextTaskCopy(activity) {
  if (!activity?.definition) {
    return 'Admin belum menerbitkan aktivitas baru untuk kelas ini.';
  }

  if (activity.key === 'praktik') {
    return 'Unggah file praktik dan kirim untuk review admin.';
  }

  return `${activity.label} siap dikerjakan. Jawaban akan tersimpan otomatis di classroom ini.`;
}

function isActivityLocked(activity) {
  return ['in_review', 'passed'].includes(activity?.meta?.status);
}

function getBadgeVariant(status) {
  if (['verified', 'passed', 'completed', 'success'].includes(status)) return 'secondary';
  if (['rejected', 'retry', 'danger'].includes(status)) return 'destructive';
  return 'outline';
}

function buildStreamItems({ portal, paymentStatus, nextTask, assessmentTimeline }) {
  const latestAssessment = assessmentTimeline
    .filter((item) => item.progress || item.latestSubmission)
    .sort((left, right) => {
      const leftDate = new Date(left.latestSubmission?.updatedAt || left.progress?.updatedAt || 0).getTime();
      const rightDate = new Date(right.latestSubmission?.updatedAt || right.progress?.updatedAt || 0).getTime();
      return rightDate - leftDate;
    })[0] || null;

  return [
    {
      id: 'access',
      tone: paymentStatus === 'verified' ? 'verified' : paymentStatus,
      category: paymentStatus === 'verified' ? 'Akses Kelas Aktif' : 'Status Pembayaran',
      title: paymentStatus === 'verified'
        ? 'Classroom Anda sudah aktif penuh'
        : 'Classroom menunggu verifikasi admin',
      body: paymentStatus === 'verified'
        ? 'Semua tab classroom sudah terbuka. Ikuti stream untuk pengumuman terbaru dari admin dan jadwal pembelajaran.'
        : 'Akses penuh ke classroom dibuka setelah pembayaran diverifikasi. Pantau sertifikat dan hubungi admin bila perlu percepatan verifikasi.',
      meta: portal.enrollment?.updatedAt || portal.student?.updatedAt || null,
    },
    {
      id: 'module',
      tone: 'current',
      category: 'Topik Aktif',
      title: portal.learning.currentModule?.title || 'Belum ada topik aktif',
      body: portal.learning.currentModule
        ? portal.learning.currentModule.summary || 'Topik ini sedang menjadi fokus pembelajaran Anda saat ini.'
        : 'Admin belum menetapkan modul aktif untuk program ini.',
      meta: portal.learning.currentModule?.updatedAt || portal.enrollment?.updatedAt || null,
    },
    {
      id: 'next-task',
      tone: nextTask?.meta?.status || 'muted',
      category: 'Agenda Berikutnya',
      title: nextTask?.label || 'Pantau update kelas',
      body: getNextTaskCopy(nextTask),
      meta: nextTask?.latestSubmission?.updatedAt || nextTask?.progress?.updatedAt || null,
    },
    {
      id: 'certificate',
      tone: portal.certificateGate.tone,
      category: 'Gate Sertifikat',
      title: portal.certificateGate.headline,
      body: portal.certificateGate.description,
      meta: portal.certificate?.updatedAt || null,
    },
    latestAssessment
      ? {
        id: `assessment-${latestAssessment.key}`,
        tone: latestAssessment.meta.status,
        category: 'Aktivitas Terbaru',
        title: latestAssessment.label,
        body: latestAssessment.progress?.notes
          || latestAssessment.latestSubmission?.feedback
          || 'Aktivitas terbaru Anda sudah tercatat pada dashboard kelas.',
        meta: latestAssessment.latestSubmission?.updatedAt || latestAssessment.progress?.updatedAt || null,
      }
      : null,
  ].filter(Boolean);
}

function BlockedClassroomState({ paymentStatus, courseTitle, certificateGate }) {
  const isRejected = paymentStatus === 'rejected';

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header">
        <div>
          <span className="student-section-eyebrow">Classroom</span>
          <h2>{courseTitle || 'Kelas Anda'}</h2>
          <p className="dash-subtitle">Akses classroom dibuka penuh setelah status keanggotaan dan pembayaran tervalidasi.</p>
        </div>
        <div className="student-section-badges">
          <span className={`student-status-chip ${paymentStatus}`}>{formatPaymentLabel(paymentStatus)}</span>
        </div>
      </section>

      <section className="student-classroom-blocked">
        <Card className="border-slate-200/80 bg-white shadow-[0_24px_50px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader className="gap-3">
            <Badge variant={isRejected ? 'destructive' : 'outline'} className="w-fit">{isRejected ? 'Akses Ditahan' : 'Menunggu Aktivasi'}</Badge>
            <CardTitle className="text-xl text-slate-950">
              {isRejected ? 'Classroom terkunci sementara' : 'Classroom siap dibuka setelah verifikasi'}
            </CardTitle>
            <CardDescription>
              {isRejected
                ? 'Admin perlu memperbarui status pembayaran atau enrollment Anda sebelum seluruh tab classroom bisa diakses kembali.'
                : 'Saat ini Anda masih berada pada tahap verifikasi. Setelah pembayaran disetujui, seluruh materi, stream, dan penilaian akan terbuka otomatis.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant={isRejected ? 'destructive' : 'default'} className="border-slate-200/80 bg-slate-50">
              <Lock />
              <AlertTitle>{isRejected ? 'Perlu tindak lanjut admin' : 'Status classroom belum aktif'}</AlertTitle>
              <AlertDescription>
                {isRejected
                  ? 'Hubungi admin melalui konsultasi untuk mempercepat pembaruan status. Riwayat sertifikat dan evaluasi lama tetap tersimpan aman.'
                  : 'Anda tetap bisa memantau gate sertifikat dan berkonsultasi dengan admin sembari menunggu verifikasi.'}
              </AlertDescription>
            </Alert>

            <div className="student-classroom-blocked-grid">
              <Card size="sm" className="border-slate-200/70 bg-slate-50 shadow-none">
                <CardHeader>
                  <CardTitle>Gate sertifikat</CardTitle>
                  <CardDescription>{certificateGate.doneCount}/{certificateGate.totalCount} syarat selesai</CardDescription>
                </CardHeader>
              </Card>
              <Card size="sm" className="border-slate-200/70 bg-slate-50 shadow-none">
                <CardHeader>
                  <CardTitle>Status pembayaran</CardTitle>
                  <CardDescription>{formatPaymentLabel(paymentStatus)}</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="student-hero-actions">
              <Button asChild>
                <Link to="/dashboard/pesan">
                  <MessageSquare data-icon="inline-start" />
                  Hubungi Admin
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/sertifikat">
                  <Award data-icon="inline-start" />
                  Lihat Gate Sertifikat
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StreamTab({ streamItems, nextTask }) {
  return (
    <div className="student-classroom-grid">
      <div className="student-classroom-main">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Feed Kelas</Badge>
            <CardTitle>Pengumuman dan update classroom</CardTitle>
            <CardDescription>Ringkasan operasional kelas Anda dirapikan sebagai stream read-only sampai feed classroom admin terhubung penuh.</CardDescription>
          </CardHeader>
          <CardContent className="student-stream-list">
            {streamItems.map((item) => (
              <article key={item.id} className="student-stream-card">
                <div className="student-stream-head">
                  <div>
                    <p className="student-stream-category">{item.category}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <Badge variant={getBadgeVariant(item.tone)}>{item.tone === 'verified' ? 'Aktif' : item.tone === 'rejected' ? 'Tertahan' : item.tone === 'current' ? 'Berjalan' : item.tone === 'passed' ? 'Lulus' : 'Update'}</Badge>
                </div>
                <p>{item.body}</p>
                <span className="student-stream-meta">{item.meta ? formatDateLabel(item.meta) : 'Informasi terbaru classroom'}</span>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="student-classroom-side">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Fokus Hari Ini</Badge>
            <CardTitle>{nextTask?.label || 'Pantau update kelas'}</CardTitle>
            <CardDescription>{getNextTaskCopy(nextTask)}</CardDescription>
          </CardHeader>
          <CardContent>
            {nextTask?.definition ? (
              <Button asChild variant="outline">
                <Link to="/dashboard/classroom/classwork">
                  <BookOpen data-icon="inline-start" />
                  Buka Classwork
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ModuleSection({ modules }) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
      <CardHeader>
        <Badge variant="outline" className="w-fit">Topics</Badge>
        <CardTitle>Topik dan materi kelas</CardTitle>
        <CardDescription>Daftar topic/classwork mengikuti Paket Kursus yang sudah dipetakan ke program Anda.</CardDescription>
      </CardHeader>
      <CardContent className="student-module-list">
        {modules.map((module) => (
          <div key={module.id} className={`student-module-card ${module.status}`}>
            <div className="student-module-main">
              <div className="student-module-number">{module.order}</div>
              <div>
                <strong>{module.title}</strong>
                <p>{module.summary || 'Ringkasan modul belum ditambahkan oleh admin.'}</p>
                <div className="student-module-meta">
                  <span>{module.durationLabel || 'Durasi fleksibel'}</span>
                  <span>{module.sizeLabel || 'File siap unduh'}</span>
                </div>
              </div>
            </div>

            <div className="student-module-actions">
              <span className={`student-status-chip ${module.status}`}>
                {module.status === 'completed' ? 'Selesai' : module.status === 'current' ? 'Aktif' : 'Terkunci'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!module.downloadable || !module.fileUrl}
                onClick={() => downloadFile(module.fileUrl, module.fileName)}
              >
                <Download data-icon="inline-start" />
                Unduh
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TheoryActivitySection({
  activity,
  availability,
  answers,
  onStart,
  onAnswerChange,
  onSubmit,
}) {
  const definition = activity?.definition;
  const submission = activity?.latestSubmission;
  const locked = isActivityLocked(activity);

  if (!definition) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
        <CardContent className="pt-6">
          <div className="dash-empty small">
            <FileText size={20} />
            <p>Admin belum menerbitkan aktivitas ini untuk kelas Anda.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
      <CardHeader>
        <div className="student-stream-head">
          <div>
            <Badge variant="outline" className="mb-3 w-fit">{activity.label}</Badge>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription>{definition.instructions}</CardDescription>
          </div>
          <Badge variant={getBadgeVariant(activity.meta.status)}>{activity.meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="student-assessment-hero">
          <div>
            <strong>{getQuestionCount(definition)} soal aktif</strong>
            <p>{activity.multipleChoiceCount} pilihan ganda, {activity.essayCount} essay.</p>
          </div>
          <div>
            <strong>Batas lulus {definition.passingScore || 75}</strong>
            <p>{submission?.updatedAt ? `Draft terakhir ${formatDateLabel(submission.updatedAt)}` : 'Belum ada draft tersimpan.'}</p>
          </div>
        </div>

        {!availability.allowed ? (
          <Alert variant="destructive" className="border-red-200/70 bg-red-50">
            <Lock />
            <AlertTitle>Akses aktivitas tertahan</AlertTitle>
            <AlertDescription>{availability.reason}</AlertDescription>
          </Alert>
        ) : null}

        {locked ? (
          <Alert className="border-slate-200/80 bg-slate-50">
            <ClipboardCheck />
            <AlertTitle>{activity.meta.status === 'passed' ? 'Aktivitas sudah lulus' : 'Aktivitas menunggu review admin'}</AlertTitle>
            <AlertDescription>
              {activity.meta.status === 'passed'
                ? 'Aktivitas ini sudah lulus dan dikunci untuk menjaga konsistensi nilai.'
                : 'Jawaban sudah dikirim dan sedang menunggu review admin.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="student-question-stack">
          {definition.questions.map((question, index) => (
            <div key={question.id} className="student-question-card">
              <div className="student-question-head">
                <span className="student-question-index">Soal {index + 1}</span>
                <Badge variant="outline">{question.kind === 'essay' ? 'Essay' : 'Pilihan Ganda'}</Badge>
              </div>
              <p className="student-question-title">{question.prompt}</p>

              {question.kind === 'multiple_choice' ? (
                <div className="student-option-stack">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`student-option-item ${String(answers[question.id] || '') === String(option.value || option.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`${activity.key}-${question.id}`}
                        checked={String(answers[question.id] || '') === String(option.value || option.id)}
                        onChange={() => onAnswerChange(activity, question.id, option.value || option.id)}
                        disabled={!availability.allowed || locked}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  className="mt-4 min-h-32 rounded-[20px] bg-white"
                  value={String(answers[question.id] || '')}
                  onChange={(event) => onAnswerChange(activity, question.id, event.target.value)}
                  placeholder="Tulis jawaban Anda di sini..."
                  disabled={!availability.allowed || locked}
                />
              )}
            </div>
          ))}
        </div>

        <div className="student-action-row">
          <Button
            type="button"
            variant="outline"
            disabled={!availability.allowed || locked}
            onClick={() => onStart(activity)}
          >
            <PlayCircle data-icon="inline-start" />
            {submission ? 'Lanjutkan Draft' : 'Mulai'}
          </Button>
          <Button
            type="button"
            disabled={!availability.allowed || locked}
            onClick={() => onSubmit(activity)}
          >
            <Send data-icon="inline-start" />
            Kirim Jawaban
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeActivitySection({
  activity,
  availability,
  uploadState,
  inputRef,
  onFileSelect,
  onSubmit,
}) {
  const definition = activity?.definition;
  const submission = activity?.latestSubmission;
  const allowedExtensions = definition?.allowedExtensions || [];
  const locked = isActivityLocked(activity);

  if (!definition) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
        <CardContent className="pt-6">
          <div className="dash-empty small">
            <Upload size={20} />
            <p>Admin belum menambahkan ujian praktik untuk kelas ini.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
      <CardHeader>
        <div className="student-stream-head">
          <div>
            <Badge variant="outline" className="mb-3 w-fit">Ujian Praktik</Badge>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription>{definition.instructions}</CardDescription>
          </div>
          <Badge variant={getBadgeVariant(activity.meta.status)}>{activity.meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="student-practice-card">
        {!availability.allowed ? (
          <Alert variant="destructive" className="border-red-200/70 bg-red-50">
            <Lock />
            <AlertTitle>Akses aktivitas tertahan</AlertTitle>
            <AlertDescription>{availability.reason}</AlertDescription>
          </Alert>
        ) : null}

        {locked ? (
          <Alert className="border-slate-200/80 bg-slate-50">
            <ClipboardCheck />
            <AlertTitle>{activity.meta.status === 'passed' ? 'Ujian praktik sudah lulus' : 'File sedang menunggu review admin'}</AlertTitle>
            <AlertDescription>
              {activity.meta.status === 'passed'
                ? 'Status praktik sudah lulus dan jawaban terkunci.'
                : 'File praktik Anda sedang ditinjau oleh admin.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="student-practice-meta">
          <div>
            <strong>Format yang diterima</strong>
            <p>{formatAllowedExtensions(allowedExtensions)}</p>
          </div>
          <div>
            <strong>Status kirim</strong>
            <p>{submission?.submittedAt ? `Terkirim ${formatDateLabel(submission.submittedAt)}` : 'Belum ada file yang dikirim.'}</p>
          </div>
        </div>

        <button
          type="button"
          className={`student-upload-area ${uploadState.error ? 'error' : ''}`}
          onClick={() => inputRef.current?.click()}
          disabled={!availability.allowed || locked}
        >
          <Upload size={28} />
          <strong>{uploadState.fileName || 'Pilih file jawaban praktik'}</strong>
          <span>{uploadState.fileName ? uploadState.fileSizeLabel : `Maksimal ${formatBytes(PRACTICE_UPLOAD_LIMIT)} untuk demo frontend.`}</span>
          <small>{uploadState.error || `Gunakan ${formatAllowedExtensions(allowedExtensions)} sesuai kelas yang sedang diikuti.`}</small>
        </button>

        <input
          ref={inputRef}
          type="file"
          className="student-hidden-file-input"
          onChange={onFileSelect}
          accept={allowedExtensions.join(',')}
          disabled={!availability.allowed || locked}
        />

        {submission?.fileName ? (
          <div className="student-submission-card">
            <div>
              <strong>{submission.fileName}</strong>
              <p>{submission.fileSizeLabel || 'File jawaban praktik sudah tersimpan pada riwayat demo ini.'}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => downloadFile(submission.fileUrl, submission.fileName)}>
              <Download data-icon="inline-start" />
              Lihat File
            </Button>
          </div>
        ) : null}

        <div className="student-action-row">
          <Button
            type="button"
            variant="outline"
            disabled={!availability.allowed || locked}
            onClick={() => inputRef.current?.click()}
          >
            <Save data-icon="inline-start" />
            Pilih File
          </Button>
          <Button
            type="button"
            disabled={!availability.allowed || locked}
            onClick={onSubmit}
          >
            <Send data-icon="inline-start" />
            Kirim untuk Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ClassworkTab = memo(function ClassworkTab({
  activities,
  modules,
  activityMap,
  paymentStatus,
  student,
  enrollment,
  course,
  setAssessmentProgress,
  setAssessmentSubmissions,
}) {
  const submitAssessmentMutation = useSubmitStudentAssessmentMutation();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('info');
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [practiceUploadState, setPracticeUploadState] = useState(EMPTY_PRACTICE_UPLOAD_STATE);
  const practiceInputRef = useRef(null);
  const autosaveTimersRef = useRef(new Map());
  const ownedAssetUrlsRef = useRef(new Set());
  const latihanAvailability = useMemo(
    () => getStudentActivityAvailability('latihan', paymentStatus, activityMap),
    [activityMap, paymentStatus],
  );
  const teoriAvailability = useMemo(
    () => getStudentActivityAvailability('teori', paymentStatus, activityMap),
    [activityMap, paymentStatus],
  );
  const praktikAvailability = useMemo(
    () => getStudentActivityAvailability('praktik', paymentStatus, activityMap),
    [activityMap, paymentStatus],
  );
  const resolvedAnswerDrafts = useMemo(() => activities.reduce((accumulator, activity) => {
    if (!activity?.key) {
      return accumulator;
    }

    const draftAnswers = answerDrafts[activity.key];
    accumulator[activity.key] =
      !draftAnswers
      || isActivityLocked(activity)
      || Object.keys(draftAnswers).length === 0
        ? activity.latestSubmission?.answers || {}
        : draftAnswers;
    return accumulator;
  }, {}), [activities, answerDrafts]);

  const showFeedback = useCallback((tone, message) => {
    setFeedbackTone(tone);
    setFeedbackMessage(message);
  }, []);

  const registerAssetUrl = useCallback((assetUrl) => {
    if (assetUrl) {
      ownedAssetUrlsRef.current.add(assetUrl);
    }
  }, []);

  const releaseAssetUrl = useCallback((assetUrl) => {
    if (!assetUrl || !ownedAssetUrlsRef.current.has(assetUrl)) {
      return;
    }

    revokeStudentAssessmentAssetUrl(assetUrl);
    ownedAssetUrlsRef.current.delete(assetUrl);
  }, []);

  const clearDraftAutosave = useCallback((activityKey) => {
    const existingTimer = autosaveTimersRef.current.get(activityKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      autosaveTimersRef.current.delete(activityKey);
    }
  }, []);

  useEffect(() => () => {
    autosaveTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    autosaveTimersRef.current.clear();
    ownedAssetUrlsRef.current.forEach((assetUrl) => revokeStudentAssessmentAssetUrl(assetUrl));
    ownedAssetUrlsRef.current.clear();
  }, []);

  const upsertSubmission = useCallback((activity, updater) => {
    if (!activity?.definition || !student || !enrollment || !course) {
      return null;
    }

    const now = new Date().toISOString();
    const existingSubmission = activity.latestSubmission || null;
    const baseSubmission = {
      id: existingSubmission?.id || `submission-${enrollment.id}-${activity.key}-${activity.definition.id}`,
      definitionId: activity.definition.id,
      type: activity.key,
      studentId: student.id,
      enrollmentId: enrollment.id,
      courseId: course.id,
      title: activity.definition.title,
      answers: existingSubmission?.answers || {},
      fileName: existingSubmission?.fileName || '',
      fileUrl: existingSubmission?.fileUrl || '',
      mimeType: existingSubmission?.mimeType || '',
      fileSizeLabel: existingSubmission?.fileSizeLabel || '',
      autoScore: existingSubmission?.autoScore ?? null,
      manualScore: existingSubmission?.manualScore ?? null,
      score: existingSubmission?.score ?? null,
      status: existingSubmission?.status || 'draft',
      feedback: existingSubmission?.feedback || '',
      startedAt: existingSubmission?.startedAt || now,
      submittedAt: existingSubmission?.submittedAt || null,
      createdAt: existingSubmission?.createdAt || now,
      updatedAt: now,
    };
    const nextSubmission = typeof updater === 'function'
      ? updater(baseSubmission)
      : { ...baseSubmission, ...updater };

    setAssessmentSubmissions((current) => {
      const filtered = current.filter((item) => String(item.id) !== String(nextSubmission.id));
      return [nextSubmission, ...filtered];
    });

    return nextSubmission;
  }, [course, enrollment, setAssessmentSubmissions, student]);

  const updateProgressRecord = useCallback((activity, payload) => {
    if (!activity || !student || !enrollment || !course) {
      return;
    }

    const now = new Date().toISOString();

    setAssessmentProgress((current) => {
      const existingRecord = current.find((item) => (
        String(item.enrollmentId) === String(enrollment.id)
        && String(item.type || '').toLowerCase() === activity.key
      )) || null;

      const nextRecord = {
        id: existingRecord?.id || `asg-${student.id}-${activity.key}`,
        enrollmentId: enrollment.id,
        studentId: student.id,
        courseId: course.id,
        type: activity.key,
        assessmentTitle: activity.definition?.title || activity.label,
        status: payload.status,
        score: payload.score ?? existingRecord?.score ?? null,
        maxScore: 100,
        notes: buildProgressNotes(activity.key, payload),
        updatedAt: now,
        createdAt: existingRecord?.createdAt || now,
        submittedAt: payload.submittedAt || existingRecord?.submittedAt || null,
        completedAt: payload.completedAt || existingRecord?.completedAt || null,
        feedback: payload.feedback || existingRecord?.feedback || '',
      };

      const filtered = current.filter((item) => String(item.id) !== String(nextRecord.id));
      return [nextRecord, ...filtered];
    });
  }, [course, enrollment, setAssessmentProgress, student]);

  const queueDraftAutosave = useCallback((activity, nextAnswers) => {
    if (!activity?.definition || !student || !enrollment) {
      return;
    }

    const timerKey = activity.key;
    clearDraftAutosave(timerKey);

    const timerId = setTimeout(() => {
      upsertSubmission(activity, (current) => ({
        ...current,
        status: ['submitted', 'passed', 'retry', 'in_review'].includes(current.status)
          ? current.status
          : 'in_progress',
        answers: nextAnswers,
      }));
      autosaveTimersRef.current.delete(timerKey);
    }, 400);

    autosaveTimersRef.current.set(timerKey, timerId);
  }, [clearDraftAutosave, enrollment, student, upsertSubmission]);

  const startTheoryActivity = useCallback((activity) => {
    if (!activity) {
      return;
    }

    upsertSubmission(activity, (current) => ({
      ...current,
      status: current.status === 'submitted' ? 'submitted' : 'in_progress',
      startedAt: current.startedAt || new Date().toISOString(),
    }));
    showFeedback('info', `${activity.label} siap dikerjakan. Jawaban Anda akan tersimpan otomatis.`);
  }, [showFeedback, upsertSubmission]);

  const handleAnswerChange = useCallback((activity, questionId, value) => {
    if (!activity) {
      return;
    }

    setAnswerDrafts((current) => {
      const currentAnswers = current[activity.key] || activity.latestSubmission?.answers || {};
      const nextAnswers = {
        ...currentAnswers,
        [questionId]: value,
      };

      queueDraftAutosave(activity, nextAnswers);

      return {
        ...current,
        [activity.key]: nextAnswers,
      };
    });
  }, [queueDraftAutosave]);

  const submitTheoryActivity = useCallback(async (activity) => {
    if (!activity?.definition) {
      return;
    }

    clearDraftAutosave(activity.key);
    const answers = resolvedAnswerDrafts[activity.key] || activity.latestSubmission?.answers || {};
    const totalQuestions = getQuestionCount(activity.definition);
    const answeredQuestions = Object.values(answers).filter(Boolean).length;

    if (answeredQuestions < totalQuestions) {
      showFeedback('danger', 'Semua soal perlu dijawab sebelum dikirim.');
      return;
    }

    const grading = calculateAutoScore(activity.definition, answers);
    const submittedAt = new Date().toISOString();
    const passingScore = Number(activity.definition.passingScore || 75);
    const finalStatus = grading.hasEssay
      ? 'in_review'
      : Number(grading.score || 0) >= passingScore
        ? 'passed'
        : 'retry';

    const nextSubmission = upsertSubmission(activity, (current) => ({
      ...current,
      status: finalStatus,
      autoScore: grading.autoScore,
      score: grading.score,
      submittedAt,
    }));

    updateProgressRecord(activity, {
      status: finalStatus,
      autoScore: grading.autoScore,
      score: grading.score,
      hasEssay: grading.hasEssay,
      submittedAt,
      completedAt: grading.hasEssay ? null : submittedAt,
    });

    try {
      await submitAssessmentMutation.mutateAsync({
        type: activity.key,
        answers,
        status: finalStatus,
        progressStatus: finalStatus,
        autoScore: grading.autoScore,
        score: grading.score,
        submittedAt,
        completedAt: grading.hasEssay ? null : submittedAt,
      });
    } catch (submitError) {
      showFeedback('danger', submitError.message || 'Jawaban belum tersimpan ke server. Coba kirim ulang.');
      return;
    }

    if (grading.hasEssay) {
      showFeedback('warning', `Skor pilihan ganda ${grading.autoScore ?? 0}/100 sudah tercatat. Jawaban essay ${activity.label.toLowerCase()} menunggu review admin.`);
      return;
    }

    if ((nextSubmission?.score ?? grading.score ?? 0) >= passingScore) {
      showFeedback('success', `${activity.label} lulus dengan skor ${nextSubmission?.score ?? grading.score}/100.`);
      return;
    }

    showFeedback('danger', `${activity.label} belum memenuhi batas lulus. Anda bisa memperbaiki jawaban dan kirim ulang.`);
  }, [
    clearDraftAutosave,
    resolvedAnswerDrafts,
    showFeedback,
    submitAssessmentMutation,
    updateProgressRecord,
    upsertSubmission,
  ]);

  const handlePracticeFileSelect = useCallback((event) => {
    const selectedFile = event.target.files?.[0] || null;
    const praktikActivity = activityMap.praktik;

    if (!selectedFile || !praktikActivity?.definition) {
      return;
    }

    const allowedExtensions = praktikActivity.definition.allowedExtensions || [];
    const fileExtension = `.${String(selectedFile.name).split('.').pop() || ''}`.toLowerCase();
    const extensionAllowed = !allowedExtensions.length
      || allowedExtensions.some((item) => String(item).toLowerCase() === fileExtension);

    if (!extensionAllowed) {
      releaseAssetUrl(practiceUploadState.assetUrl);
      setPracticeUploadState({
        ...EMPTY_PRACTICE_UPLOAD_STATE,
        error: `Format file belum didukung. Gunakan ${formatAllowedExtensions(allowedExtensions)}.`,
      });
      return;
    }

    if (selectedFile.size > PRACTICE_UPLOAD_LIMIT) {
      releaseAssetUrl(practiceUploadState.assetUrl);
      setPracticeUploadState({
        ...EMPTY_PRACTICE_UPLOAD_STATE,
        error: 'Ukuran file melebihi batas demo 2MB.',
      });
      return;
    }

    releaseAssetUrl(practiceUploadState.assetUrl);

    const nextAsset = createStudentAssessmentAsset(selectedFile);
    registerAssetUrl(nextAsset.assetUrl);
    setPracticeUploadState({
      assetUrl: nextAsset.assetUrl,
      fileName: nextAsset.fileName,
      fileSizeLabel: formatBytes(nextAsset.fileSize),
      mimeType: nextAsset.mimeType,
      error: '',
    });
    showFeedback('info', `File ${selectedFile.name} siap dikirim untuk review admin.`);
  }, [
    activityMap.praktik,
    practiceUploadState.assetUrl,
    registerAssetUrl,
    releaseAssetUrl,
    showFeedback,
  ]);

  const submitPracticeActivity = useCallback(async () => {
    const activity = activityMap.praktik;
    if (!activity?.definition) {
      return;
    }

    if (!practiceUploadState.fileName || !practiceUploadState.assetUrl) {
      showFeedback('danger', 'Pilih file jawaban praktik terlebih dahulu.');
      return;
    }

    const submittedAt = new Date().toISOString();
    const localAssetUrl = practiceUploadState.assetUrl;

    if (activity.latestSubmission?.fileUrl && activity.latestSubmission.fileUrl !== localAssetUrl) {
      releaseAssetUrl(activity.latestSubmission.fileUrl);
    }

    upsertSubmission(activity, (current) => ({
      ...current,
      status: 'in_review',
      fileName: practiceUploadState.fileName,
      fileUrl: localAssetUrl,
      mimeType: practiceUploadState.mimeType,
      fileSizeLabel: practiceUploadState.fileSizeLabel,
      submittedAt,
    }));

    updateProgressRecord(activity, {
      status: 'in_review',
      notes: `File praktik ${practiceUploadState.fileName} sudah dikirim dan menunggu review admin.`,
      submittedAt,
    });

    try {
      await submitAssessmentMutation.mutateAsync({
        type: activity.key,
        status: 'in_review',
        progressStatus: 'in_review',
        fileName: practiceUploadState.fileName,
        mimeType: practiceUploadState.mimeType,
        fileSizeLabel: practiceUploadState.fileSizeLabel,
        submittedAt,
        localAssetUrl,
      });
    } catch (uploadError) {
      showFeedback('danger', uploadError.message || 'Upload gagal diproses.');
      return;
    }

    setPracticeUploadState(EMPTY_PRACTICE_UPLOAD_STATE);
    if (practiceInputRef.current) {
      practiceInputRef.current.value = '';
    }

    showFeedback('warning', 'Jawaban praktik berhasil dikirim. Admin akan meninjau file Anda.');
  }, [
    activityMap.praktik,
    practiceUploadState,
    releaseAssetUrl,
    showFeedback,
    submitAssessmentMutation,
    updateProgressRecord,
    upsertSubmission,
  ]);

  return (
    <div className="student-classwork-stack">
      {feedbackMessage ? (
        <Alert
          variant={feedbackTone === 'danger' ? 'destructive' : 'default'}
          className={feedbackTone === 'success' ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900' : feedbackTone === 'warning' ? 'border-amber-200/80 bg-amber-50 text-amber-900' : 'border-slate-200/80 bg-white'}
        >
          <ClipboardCheck />
          <AlertTitle>Update classwork</AlertTitle>
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      ) : null}

      <ModuleSection modules={modules} />

      <TheoryActivitySection
        activity={activityMap.latihan}
        availability={latihanAvailability}
        answers={resolvedAnswerDrafts.latihan || activityMap.latihan?.latestSubmission?.answers || {}}
        onStart={startTheoryActivity}
        onAnswerChange={handleAnswerChange}
        onSubmit={submitTheoryActivity}
      />

      <TheoryActivitySection
        activity={activityMap.teori}
        availability={teoriAvailability}
        answers={resolvedAnswerDrafts.teori || activityMap.teori?.latestSubmission?.answers || {}}
        onStart={startTheoryActivity}
        onAnswerChange={handleAnswerChange}
        onSubmit={submitTheoryActivity}
      />

      <PracticeActivitySection
        activity={activityMap.praktik}
        availability={praktikAvailability}
        uploadState={practiceUploadState}
        inputRef={practiceInputRef}
        onFileSelect={handlePracticeFileSelect}
        onSubmit={submitPracticeActivity}
      />
    </div>
  );
});

function GradesTab({ assessmentTimeline, certificateGate, learning }) {
  return (
    <div className="student-classroom-grid">
      <div className="student-classroom-main">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Grades</Badge>
            <CardTitle>Ringkasan nilai dan progres</CardTitle>
            <CardDescription>Tab ini mempertahankan pembacaan nilai dari assessment lama sambil merangkum progres classroom Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="whitespace-normal">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessmentTimeline.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(item.meta.status)}>{item.meta.label}</Badge>
                    </TableCell>
                    <TableCell>{item.progress?.score ?? item.latestSubmission?.score ?? '-'} / 100</TableCell>
                    <TableCell className="whitespace-normal text-slate-600">
                      {item.progress?.notes || item.latestSubmission?.feedback || 'Belum ada catatan tambahan.'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <aside className="student-classroom-side">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Ringkasan</Badge>
            <CardTitle>Snapshot kelulusan</CardTitle>
          </CardHeader>
          <CardContent className="student-grade-summary">
            <div className="student-grade-summary-item">
              <span>Progres belajar</span>
              <strong>{learning.completionPercent}%</strong>
            </div>
            <div className="student-grade-summary-item">
              <span>Modul selesai</span>
              <strong>{learning.completedModules}/{learning.totalModules}</strong>
            </div>
            <div className="student-grade-summary-item">
              <span>Gate sertifikat</span>
              <strong>{certificateGate.doneCount}/{certificateGate.totalCount}</strong>
            </div>
            <div className="student-grade-summary-item">
              <span>Status dokumen</span>
              <strong>{certificateGate.downloadReady ? 'Siap unduh' : 'Belum diterbitkan'}</strong>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function PeopleTab({ portal, paymentStatus }) {
  return (
    <div className="student-classroom-grid">
      <div className="student-classroom-main">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">People</Badge>
            <CardTitle>Keanggotaan classroom</CardTitle>
            <CardDescription>Versi siswa bersifat read-only dan menampilkan identitas classroom yang saat ini aktif untuk akun Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peran</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell className="font-medium">{portal.student.name}</TableCell>
                  <TableCell className="whitespace-normal text-slate-600">NIS {portal.student.nis} • {portal.course?.title || portal.student.program || 'Program belum ditetapkan'}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(paymentStatus)}>{formatPaymentLabel(paymentStatus)}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Enrollment</TableCell>
                  <TableCell className="font-medium">{portal.enrollment?.status || portal.student.status || 'active'}</TableCell>
                  <TableCell className="whitespace-normal text-slate-600">Progress {portal.learning.completionPercent}% • Modul aktif {portal.learning.currentModule?.title || 'Belum ada modul aktif'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Read-only</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Support</TableCell>
                  <TableCell className="font-medium">Admin LKP Parduli Rasa</TableCell>
                  <TableCell className="whitespace-normal text-slate-600">Gunakan konsultasi untuk verifikasi pembayaran, revisi nilai, atau kebutuhan bantuan kelas.</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Tersedia</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <aside className="student-classroom-side">
        <Card className="border-slate-200/80 bg-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">Support</Badge>
            <CardTitle>Bantuan kelas</CardTitle>
            <CardDescription>Semua perubahan anggota classroom tetap dikelola admin.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert className="border-slate-200/80 bg-slate-50">
              <Users />
              <AlertTitle>People bersifat baca saja</AlertTitle>
              <AlertDescription>Jika ada perubahan program, pembayaran, atau status enrollment, ajukan melalui konsultasi agar admin memperbarui data Anda.</AlertDescription>
            </Alert>
            <Button asChild variant="outline">
              <Link to="/dashboard/pesan">
                <MessageSquare data-icon="inline-start" />
                Buka Konsultasi
              </Link>
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default function StudentClassroomPage({
  compatibilityMode = false,
  defaultTab = 'classwork',
}) {
  const navigate = useNavigate();
  const { tab: routeTab } = useParams();
  const {
    isReady,
    error,
    portal,
    classroomAccess,
    setAssessmentProgress,
    setAssessmentSubmissions,
  } = useStudentClassroomData();

  const currentTab = CLASSROOM_TABS.some((item) => item.key === routeTab) ? routeTab : defaultTab;
  const [activeTab, setActiveTab] = useState(currentTab);
  const paymentStatus = portal.enrollment?.paymentStatus || portal.student?.paymentStatus || 'pending';
  const activities = useMemo(() => portal.assessmentActivities || [], [portal.assessmentActivities]);
  const activityMap = useMemo(() => Object.fromEntries(activities.map((item) => [item.key, item])), [activities]);
  const nextTask = portal.nextActionableActivity;
  const assessmentTimeline = useMemo(() => activities.map((item) => ({
    ...item,
    availability: getStudentActivityAvailability(item.key, paymentStatus, activityMap),
  })), [activities, activityMap, paymentStatus]);
  const streamItems = useMemo(() => buildStreamItems({
    portal,
    paymentStatus,
    nextTask,
    assessmentTimeline,
  }), [assessmentTimeline, nextTask, paymentStatus, portal]);
  const hasClassroomAccess = classroomAccess?.canAccess ?? false;

  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  if (!isReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Menyiapkan classroom Anda...</h2>
          <p>Stream, classwork, nilai, dan anggota kelas sedang diproses.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Classroom belum bisa dimuat</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!portal.student || !portal.course) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Classroom belum terpetakan</h2>
          <p>Program siswa Anda belum tersambung ke katalog kelas. Silakan hubungi admin.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (value) => {
    setActiveTab(value);

    if (!compatibilityMode) {
      navigate(`/dashboard/classroom/${value}`);
    }
  };

  if (!hasClassroomAccess) {
    return (
      <BlockedClassroomState
        paymentStatus={paymentStatus}
        courseTitle={portal.course.title}
        certificateGate={portal.certificateGate}
      />
    );
  }

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header">
        <div>
          <span className="student-section-eyebrow">Classroom</span>
          <h2>{portal.course.title}</h2>
          <p className="dash-subtitle">Pusat stream, classwork, nilai, dan anggota kelas untuk program kursus Anda.</p>
        </div>
        <div className="student-section-badges">
          <span className={`student-status-chip ${paymentStatus}`}>{formatPaymentLabel(paymentStatus)}</span>
        </div>
      </section>

      <section className="student-class-hero">
        <div className="student-class-copy">
          <div className="student-class-icon"><BookOpen size={24} /></div>
          <div>
            <h3>{portal.course.title}</h3>
            <p>{portal.course.description || 'Program ini memuat daftar modul, pengumuman, dan checkpoint kelulusan siswa.'}</p>
          </div>
        </div>

        <div className="student-class-progress">
          <div>
            <span>Progress</span>
            <strong>{portal.learning.completionPercent}%</strong>
          </div>
          <div>
            <span>Modul aktif</span>
            <strong>{portal.modules.filter((module) => module.status !== 'upcoming').length}/{portal.modules.length}</strong>
          </div>
          <div>
            <span>Tugas berikutnya</span>
            <strong>{nextTask?.label || 'Pantau update kelas'}</strong>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="student-classroom-shell">
        <TabsList variant="line" className="student-classroom-tabs">
          {CLASSROOM_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="student-classroom-trigger">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stream">
          <StreamTab streamItems={streamItems} nextTask={nextTask} />
        </TabsContent>

        <TabsContent value="classwork">
          <ClassworkTab
            activities={activities}
            modules={portal.modules}
            activityMap={activityMap}
            paymentStatus={paymentStatus}
            student={portal.student}
            enrollment={portal.enrollment}
            course={portal.course}
            setAssessmentProgress={setAssessmentProgress}
            setAssessmentSubmissions={setAssessmentSubmissions}
          />
        </TabsContent>

        <TabsContent value="grades">
          <GradesTab
            assessmentTimeline={assessmentTimeline}
            certificateGate={portal.certificateGate}
            learning={portal.learning}
          />
        </TabsContent>

        <TabsContent value="people">
          <PeopleTab portal={portal} paymentStatus={paymentStatus} />
        </TabsContent>
      </Tabs>

      <section className="student-support-cta">
        <Button asChild variant="outline">
          <Link to="/dashboard/sertifikat">
            <ShieldCheck data-icon="inline-start" />
            Lihat Gate Sertifikat
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/dashboard/pesan">
            <MessageSquare data-icon="inline-start" />
            Konsultasi dengan Admin
          </Link>
        </Button>
      </section>
    </div>
  );
}
