export const ASSESSMENT_TYPE_CONFIG = [
  { key: 'latihan', label: 'Latihan' },
  { key: 'teori', label: 'Ujian Teori' },
  { key: 'praktik', label: 'Ujian Praktik' },
];

export const CLASSWORK_TYPE_CONFIG = [
  { key: 'assignment', label: 'Assignment', bucket: 'assignment', source: 'classroom' },
  { key: 'quiz_assignment', label: 'Quiz Assignment', bucket: 'quiz', source: 'classroom' },
  { key: 'question', label: 'Question', bucket: 'question', source: 'classroom' },
  { key: 'material', label: 'Material', bucket: 'material', source: 'module' },
  { key: 'latihan', label: 'Latihan', bucket: 'latihan', source: 'assessment' },
  { key: 'teori', label: 'Ujian Teori', bucket: 'teori', source: 'assessment' },
  { key: 'praktik', label: 'Ujian Praktik', bucket: 'praktik', source: 'assessment' },
];

const PASSING_STATUSES = new Set(['passed', 'completed', 'approved']);
const RETRY_STATUSES = new Set(['retry', 'failed', 'needs_revision']);
const ACTIVE_ENROLLMENT_STATUSES = new Set(['active', 'completed']);
const VERIFIED_PAYMENT_STATUSES = new Set(['verified']);
const BLOCKED_PAYMENT_STATUSES = new Set(['rejected']);

function getOptionLetter(index) {
  return String.fromCharCode(65 + index);
}

export function normalizeComparable(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeLoginIdentifier(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeAssessmentType(value) {
  const comparableValue = normalizeComparable(value);
  const matchedConfig = ASSESSMENT_TYPE_CONFIG.find((item) => (
    normalizeComparable(item.key) === comparableValue
    || normalizeComparable(item.label) === comparableValue
  ));

  return matchedConfig?.key || String(value || '').trim().toLowerCase();
}

export function getAssessmentTypeConfig(type) {
  const normalizedType = normalizeAssessmentType(type);
  const matchedConfig = ASSESSMENT_TYPE_CONFIG.find((item) => item.key === normalizedType);

  return matchedConfig || {
    key: normalizedType,
    label: normalizedType
      ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)
      : 'Assessment',
  };
}

export function normalizeAssessmentProgressStatus(status, fallback = 'not_started') {
  const normalizedStatus = String(status || '').toLowerCase();

  if (!normalizedStatus) return fallback;
  if (normalizedStatus === 'reviewed' || normalizedStatus === 'completed' || normalizedStatus === 'approved') return 'passed';
  if (normalizedStatus === 'submitted') return 'in_review';
  if (normalizedStatus === 'draft') return 'in_progress';
  if (RETRY_STATUSES.has(normalizedStatus)) return 'retry';
  if (normalizedStatus === 'pending') return 'not_started';

  return normalizedStatus;
}

export function normalizeSubmissionStatus(status) {
  return normalizeAssessmentProgressStatus(status, 'in_progress');
}

export function normalizeSubmissionAnswers(answers) {
  if (Array.isArray(answers)) {
    return answers.reduce((accumulator, item, index) => {
      const questionId = item?.questionId || item?.id || `question-${index + 1}`;
      return {
        ...accumulator,
        [questionId]: item?.value ?? item?.answer ?? item?.response ?? '',
      };
    }, {});
  }

  return typeof answers === 'object' && answers ? answers : {};
}

export function normalizeAssessmentQuestion(question = {}, index = 0, definitionId = 'assessment') {
  const kind = question.kind === 'multiple_choice' ? 'multiple_choice' : 'essay';
  const optionSource = Array.isArray(question.options) && question.options.length
    ? question.options
    : Array.isArray(question.choices)
      ? question.choices
      : [];
  const options = kind === 'multiple_choice'
    ? optionSource
      .map((option, optionIndex) => {
        const letter = getOptionLetter(optionIndex);
        const rawValue = typeof option === 'object' && option ? option.value ?? option.label ?? option.text ?? option.id : option;
        const label = typeof option === 'object' && option ? option.label || option.text || String(rawValue || letter) : String(option || letter);

        return {
          id: String((typeof option === 'object' && option ? option.id : '') || letter.toLowerCase()),
          label,
          value: String(rawValue || label || letter),
        };
      })
      .filter((option) => option.label.trim() || option.value.trim())
    : [];
  const rawAnswer = question.answer ?? question.correctAnswer ?? question.correctOptionId ?? '';
  const answerKey = String(question.answerKey || '').trim();
  const matchedAnswerOption = options.find((option, optionIndex) => {
    const letter = getOptionLetter(optionIndex);
    return (
      answerKey
      && (
        answerKey.toLowerCase() === letter.toLowerCase()
        || answerKey.toLowerCase() === option.id.toLowerCase()
        || answerKey === option.value
        || answerKey === option.label
      )
    );
  });
  const matchedRawAnswerOption = options.find((option) => (
    rawAnswer
    && (
      String(rawAnswer) === String(option.id)
      || String(rawAnswer) === String(option.value)
      || String(rawAnswer) === String(option.label)
    )
  ));

  return {
    ...question,
    id: String(question.id || `${definitionId}-question-${index + 1}`),
    kind,
    prompt: question.prompt || question.label || question.title || '',
    options,
    answer: kind === 'multiple_choice'
      ? String(matchedRawAnswerOption?.value || matchedAnswerOption?.value || rawAnswer || '')
      : question.answer ?? null,
    weight: Number(question.weight) > 0 ? Number(question.weight) : 1,
  };
}

export function normalizeAssessmentDefinition(definition = {}) {
  const typeConfig = getAssessmentTypeConfig(definition.type);
  const definitionId = definition.id || `definition-${definition.courseId || 'course'}-${typeConfig.key}`;
  const instructionValue = Array.isArray(definition.instructions)
    ? definition.instructions.filter(Boolean).join(' ')
    : String(definition.instructions || '');
  const allowedExtensions = Array.isArray(definition.allowedExtensions)
    ? definition.allowedExtensions
    : typeof definition.allowedExtensions === 'string'
      ? definition.allowedExtensions.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    ...definition,
    id: definitionId,
    type: typeConfig.key,
    title: definition.title || typeConfig.label,
    description: definition.description || definition.summary || '',
    summary: definition.summary || definition.description || '',
    instructions: instructionValue,
    passingScore: Number(definition.passingScore || 75),
    maxScore: Number(definition.maxScore || 100),
    maxAttempts: Number(definition.maxAttempts || (typeConfig.key === 'latihan' ? 3 : 1)),
    allowRetry: definition.allowRetry ?? typeConfig.key !== 'teori',
    allowedExtensions,
    questions: Array.isArray(definition.questions)
      ? definition.questions.map((question, index) => normalizeAssessmentQuestion(question, index, definitionId))
      : [],
  };
}

export function buildAssessmentRecordKey(reference = {}) {
  return [
    reference.enrollmentId ?? '',
    reference.studentId ?? '',
    reference.courseId ?? '',
    normalizeAssessmentType(reference.type),
  ].join(':');
}

export function getCourseAliases(course) {
  const title = String(course?.title || '').trim();
  const aliases = Array.isArray(course?.aliases) ? course.aliases : [];
  const derivedAliases = [
    title,
    title.replace(/^Aplikasi\s+/i, ''),
    title.replace(/^Desain Grafis\s+/i, ''),
    title.replace(/\bAplikasi\b/gi, '').trim(),
  ].filter(Boolean);

  return Array.from(new Set(
    [...aliases, ...derivedAliases]
      .map((value) => normalizeComparable(value))
      .filter(Boolean),
  ));
}

export function findCourseByReference(courseItems, reference = {}) {
  if (!Array.isArray(courseItems) || courseItems.length === 0) {
    return null;
  }

  if (reference.courseId != null) {
    const matchedById = courseItems.find((course) => String(course.id) === String(reference.courseId));
    if (matchedById) {
      return matchedById;
    }
  }

  const comparableValues = [
    reference.program,
    reference.courseTitle,
    reference.title,
    reference.courseName,
  ].map((value) => normalizeComparable(value)).filter(Boolean);

  if (!comparableValues.length) {
    return null;
  }

  return courseItems.find((course) => {
    const aliases = getCourseAliases(course);
    return comparableValues.some((value) => aliases.includes(value));
  }) || null;
}

export function findEnrollmentByReference(enrollmentItems, reference = {}, courseItems = []) {
  if (!Array.isArray(enrollmentItems) || enrollmentItems.length === 0) {
    return null;
  }

  if (reference.enrollmentId != null) {
    const matchedById = enrollmentItems.find((item) => String(item.id) === String(reference.enrollmentId));
    if (matchedById) {
      return matchedById;
    }
  }

  const comparableCourse = findCourseByReference(courseItems, reference);
  const comparableStudentId = reference.studentId != null ? String(reference.studentId) : '';

  return enrollmentItems.find((item) => {
    const sameStudent = comparableStudentId ? String(item.studentId) === comparableStudentId : true;
    const sameCourse = comparableCourse ? String(item.courseId) === String(comparableCourse.id) : true;
    const sameProgram = reference.program
      ? normalizeComparable(item.program || item.courseTitleSnapshot || item.courseTitle) === normalizeComparable(reference.program)
      : true;

    return sameStudent && sameCourse && sameProgram;
  }) || null;
}

export function findAssessmentDefinitionByReference(definitionItems, reference = {}) {
  if (!Array.isArray(definitionItems) || definitionItems.length === 0) {
    return null;
  }

  if (reference.id != null) {
    const matchedById = definitionItems.find((item) => String(item.id) === String(reference.id));
    if (matchedById) {
      return matchedById;
    }
  }

  const comparableType = normalizeAssessmentType(reference.type);
  const comparableCourse = reference.courseId != null ? String(reference.courseId) : '';

  const matchedDefinition = definitionItems.find((item) => {
    const sameCourse = comparableCourse ? String(item.courseId) === comparableCourse : true;
    const sameType = comparableType ? normalizeAssessmentType(item.type) === comparableType : true;
    return sameCourse && sameType;
  }) || null;

  return matchedDefinition ? normalizeAssessmentDefinition(matchedDefinition) : null;
}

export function resolveStudentByReference(students, reference = {}) {
  if (!Array.isArray(students)) {
    return null;
  }

  if (reference.studentId != null) {
    const matchedById = students.find((student) => String(student.id) === String(reference.studentId));
    if (matchedById) {
      return matchedById;
    }
  }

  const comparableEmail = normalizeLoginIdentifier(reference.email);
  const comparableNis = normalizeComparable(reference.nis);

  return students.find((student) => {
    const sameEmail = comparableEmail
      ? normalizeLoginIdentifier(student.email) === comparableEmail
      : false;
    const sameNis = comparableNis
      ? normalizeComparable(student.nis) === comparableNis
      : false;
    return sameEmail || sameNis;
  }) || null;
}

export function getAccountIdentifiers(account = {}, student = null) {
  return [
    account.username,
    account.email,
    account.loginId,
    student?.email,
    student?.nis,
  ]
    .filter(Boolean)
    .map((value) => normalizeLoginIdentifier(value));
}

export function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

export function getStudentClassroomAccessState(portal) {
  if (!portal?.student || !portal?.course || !portal?.enrollment) {
    return {
      canAccess: false,
      tone: 'slate',
      title: 'Kelas belum terpetakan',
      description: 'Akun siswa belum tersambung ke classroom program kursus yang aktif.',
    };
  }

  const paymentStatus = String(portal.enrollment?.paymentStatus || portal.student?.paymentStatus || '').toLowerCase();
  if (paymentStatus === 'verified') {
    return {
      canAccess: true,
      tone: 'emerald',
      title: 'Akses classroom aktif',
      description: 'Siswa dapat membuka seluruh area belajar sesuai program kursus yang terdaftar.',
    };
  }

  if (paymentStatus === 'rejected') {
    return {
      canAccess: false,
      tone: 'rose',
      title: 'Akses classroom ditahan',
      description: 'Status pembayaran perlu diperbarui admin sebelum siswa bisa membuka workspace classroom penuh.',
    };
  }

  return {
    canAccess: false,
    tone: 'amber',
    title: 'Menunggu verifikasi pembayaran',
    description: 'Akses classroom penuh akan dibuka setelah pembayaran diverifikasi oleh admin.',
  };
}

export function buildModuleDownloadFallback(courseTitle, moduleTitle, summary = '') {
  const content = [
    'LKP Parduli Rasa Komputer',
    `Program: ${courseTitle || '-'}`,
    `Modul: ${moduleTitle || '-'}`,
    '',
    'Ringkasan:',
    summary || `${moduleTitle || 'Modul ini'} merupakan bagian dari materi belajar siswa.`,
    '',
    'Catatan:',
    'File ini dibuat sebagai fallback modul unduhan pada sistem demo frontend.',
  ].join('\n');

  return {
    mimeType: 'text/plain',
    fileName: `${String(moduleTitle || 'modul')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'modul'}.txt`,
    fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
    sizeLabel: `${Math.max(1, Math.ceil(content.length / 120))} KB`,
  };
}

export function normalizeThreadMessages(thread) {
  const normalizeAttachments = (source = {}, fallbackIdPrefix = 'attachment') => {
    const directAttachments = Array.isArray(source?.attachments)
      ? source.attachments
        .filter(Boolean)
        .map((attachment, index) => {
          const name = String(attachment?.name || attachment?.fileName || '').trim();
          const url = String(attachment?.url || attachment?.fileUrl || '').trim();
          if (!name && !url) return null;

          return {
            id: String(attachment?.id || `${fallbackIdPrefix}-${index + 1}`),
            name: name || 'Lampiran',
            url,
            mimeType: String(attachment?.mimeType || attachment?.type || '').trim(),
            sizeBytes: Number(attachment?.sizeBytes ?? attachment?.fileSize ?? 0) || 0,
            sizeLabel: String(attachment?.sizeLabel || attachment?.fileSizeLabel || '').trim(),
          };
        })
        .filter(Boolean)
      : [];

    if (directAttachments.length > 0) {
      return directAttachments;
    }

    const fallbackName = String(source?.fileName || '').trim();
    const fallbackUrl = String(source?.fileUrl || '').trim();
    if (!fallbackName && !fallbackUrl) {
      return [];
    }

    return [{
      id: String(source?.attachmentId || source?.id || `${fallbackIdPrefix}-1`),
      name: fallbackName || 'Lampiran',
      url: fallbackUrl,
      mimeType: String(source?.mimeType || '').trim(),
      sizeBytes: Number(source?.fileSize || 0) || 0,
      sizeLabel: String(source?.fileSizeLabel || '').trim(),
    }];
  };

  const fallbackCreatedAt = toIsoDate(thread?.createdAt || thread?.date || thread?.updatedAt);
  const existingMessages = Array.isArray(thread?.messages)
    ? thread.messages
      .filter(Boolean)
      .map((message, index) => {
        const attachments = normalizeAttachments(message, `${thread?.id || 'thread'}-message-${index + 1}-attachment`);
        const firstAttachment = attachments[0] || null;

        return {
          id: String(message.id || `${thread?.id || 'thread'}-message-${index + 1}`),
          authorRole: String(message.authorRole || message.role || (index === 0 ? 'student' : 'admin')).toLowerCase(),
          authorName: message.authorName || message.senderName || (index === 0 ? thread?.senderName || thread?.studentName || 'Siswa' : 'Admin LKP'),
          body: String(message.body || message.message || ''),
          createdAt: toIsoDate(message.createdAt || message.date || fallbackCreatedAt),
          attachments,
          fileName: firstAttachment?.name || '',
          fileUrl: firstAttachment?.url || '',
          mimeType: firstAttachment?.mimeType || String(message?.mimeType || ''),
          fileSize: firstAttachment?.sizeBytes || Number(message?.fileSize || 0) || 0,
          fileSizeLabel: firstAttachment?.sizeLabel || String(message?.fileSizeLabel || ''),
        };
      })
      .filter((message) => message.body || message.attachments.length > 0)
    : [];

  const synthesizedMessages = [];
  const studentBody = String(thread?.body || thread?.message || '');

  if (studentBody) {
    synthesizedMessages.push({
      id: `${thread?.id || 'thread'}-message-student`,
      authorRole: 'student',
      authorName: thread?.senderName || thread?.studentName || 'Siswa',
      body: studentBody,
      createdAt: fallbackCreatedAt,
    });
  }

  const responses = Array.isArray(thread?.responses)
    ? thread.responses
    : thread?.response
      ? [{
        id: `${thread?.id || 'thread'}-response-1`,
        body: thread.response,
        createdAt: fallbackCreatedAt,
        authorName: 'Admin LKP',
      }]
      : [];

  responses
    .filter((response) => response?.body || response?.message || response?.fileUrl || response?.attachments?.length)
    .forEach((response, index) => {
      const attachments = normalizeAttachments(response, `${thread?.id || 'thread'}-response-${index + 1}-attachment`);
      const firstAttachment = attachments[0] || null;

      synthesizedMessages.push({
        id: String(response.id || `${thread?.id || 'thread'}-message-admin-${index + 1}`),
        authorRole: 'admin',
        authorName: response.authorName || 'Admin LKP',
        body: String(response.body || response.message || ''),
        createdAt: toIsoDate(response.createdAt || response.date || fallbackCreatedAt),
        attachments,
        fileName: firstAttachment?.name || '',
        fileUrl: firstAttachment?.url || '',
        mimeType: firstAttachment?.mimeType || String(response?.mimeType || ''),
        fileSize: firstAttachment?.sizeBytes || Number(response?.fileSize || 0) || 0,
        fileSizeLabel: firstAttachment?.sizeLabel || String(response?.fileSizeLabel || ''),
      });
    });

  const messages = existingMessages.length ? existingMessages : synthesizedMessages;
  const studentMessage = messages.find((message) => message.authorRole === 'student') || messages[0] || null;
  const latestMessage = messages[messages.length - 1] || studentMessage;

  return {
    messages,
    body: studentMessage?.body || '',
    responses: messages
      .filter((message) => message.authorRole === 'admin')
      .map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        authorName: message.authorName,
        attachments: message.attachments || [],
        fileName: message.fileName || '',
        fileUrl: message.fileUrl || '',
        mimeType: message.mimeType || '',
        fileSize: message.fileSize || 0,
        fileSizeLabel: message.fileSizeLabel || '',
      })),
    lastMessageAt: latestMessage?.createdAt || fallbackCreatedAt,
  };
}

export function buildSessionUser({ account, student, enrollment, course }) {
  if (!account && !student) {
    return null;
  }

  return {
    id: account?.id || student?.id || null,
    accountId: account?.id || null,
    username: account?.username || '',
    role: account?.role || 'student',
    name: account?.name || account?.displayName || student?.name || '',
    displayName: account?.displayName || account?.name || student?.name || '',
    email: account?.email || student?.email || '',
    studentId: student?.id ?? account?.studentId ?? null,
    nis: student?.nis || account?.nis || '',
    courseId: enrollment?.courseId ?? student?.courseId ?? account?.courseId ?? course?.id ?? null,
    enrollmentId: enrollment?.id ?? student?.enrollmentId ?? account?.enrollmentId ?? null,
    program: student?.program || course?.title || account?.program || '',
    courseTitle: course?.title || enrollment?.courseTitleSnapshot || '',
    permissions: Array.isArray(account?.permissions) ? account.permissions : [],
    status: account?.status || student?.status || 'active',
  };
}

export function getAssessmentStatusMeta(status) {
  const normalizedStatus = normalizeAssessmentProgressStatus(status);

  if (PASSING_STATUSES.has(normalizedStatus)) {
    return { status: 'passed', label: 'Lulus', tone: 'success' };
  }

  if (normalizedStatus === 'retry') {
    return { status: 'retry', label: 'Perlu Ulang', tone: 'danger' };
  }

  if (normalizedStatus === 'in_review' || normalizedStatus === 'submitted') {
    return { status: normalizedStatus, label: 'Menunggu Review', tone: 'warning' };
  }

  if (normalizedStatus === 'in_progress') {
    return { status: 'in_progress', label: 'Sedang Dikerjakan', tone: 'info' };
  }

  return { status: 'not_started', label: 'Belum Mulai', tone: 'muted' };
}

export function summarizeAssessmentStatuses(records) {
  return ASSESSMENT_TYPE_CONFIG.map((item) => {
    const record = Array.isArray(records)
      ? records.find((candidate) => normalizeAssessmentType(candidate.type) === item.key)
      : null;
    const meta = getAssessmentStatusMeta(record?.status);

    return {
      key: item.key,
      label: item.label,
      meta,
      record,
      done: meta.status === 'passed',
    };
  });
}

export function isCertificateEligible({ paymentStatus, assessments }) {
  const paymentVerified = String(paymentStatus || '').toLowerCase() === 'verified';
  const assessmentSummary = summarizeAssessmentStatuses(assessments);

  return paymentVerified && assessmentSummary.every((item) => item.done);
}

export function buildCertificateGate({ paymentStatus, assessments, certificate }) {
  const assessmentSummary = summarizeAssessmentStatuses(assessments);
  const paymentVerified = String(paymentStatus || '').toLowerCase() === 'verified';
  const certificateAvailable = Boolean(certificate);
  const downloadReady = Boolean(certificate?.fileUrl);

  const checklist = [
    {
      id: 'payment',
      label: 'Pembayaran terverifikasi',
      done: paymentVerified,
      description: paymentVerified
        ? 'Akses kelas penuh sudah dibuka oleh admin.'
        : 'Pembayaran masih menunggu verifikasi dari admin.',
    },
    ...assessmentSummary.map((item) => ({
      id: item.key,
      label: item.label,
      done: item.done,
      description: item.done
        ? `${item.label} sudah dinyatakan lulus.`
        : `${item.label} belum memenuhi syarat kelulusan.`,
      tone: item.meta.tone,
    })),
    {
      id: 'certificate',
      label: 'Sertifikat diterbitkan admin',
      done: certificateAvailable,
      description: certificateAvailable
        ? 'Dokumen sertifikat sudah tercatat pada dashboard siswa.'
        : 'Sertifikat akan muncul setelah admin menerbitkan dokumen akhir.',
    },
  ];

  const eligible = paymentVerified && assessmentSummary.every((item) => item.done);

  let tone = 'warning';
  let headline = 'Lengkapi syarat sebelum sertifikat dibuka';
  let description = 'Siswa perlu menyelesaikan evaluasi dan menunggu penerbitan dokumen dari admin.';

  if (eligible && !certificateAvailable) {
    tone = 'info';
    headline = 'Siswa sudah layak menerima sertifikat';
    description = 'Semua evaluasi telah lulus. Menunggu admin mengunggah file sertifikat.';
  }

  if (eligible && downloadReady) {
    tone = 'success';
    headline = 'Sertifikat siap diunduh';
    description = 'Seluruh syarat terpenuhi dan file sertifikat sudah tersedia.';
  }

  return {
    checklist,
    eligible,
    downloadReady,
    doneCount: checklist.filter((item) => item.done).length,
    totalCount: checklist.length,
    tone,
    headline,
    description,
    assessmentSummary,
  };
}

export function getStudentActivityAvailability(activityKey, paymentStatus, activityMap) {
  const activity = activityMap?.[activityKey];
  if (!activity?.definition) {
    return { allowed: false, reason: 'Admin belum menerbitkan aktivitas ini.' };
  }

  if (paymentStatus === 'rejected') {
    return { allowed: false, reason: 'Akses dikunci sampai status pembayaran diperbarui admin.' };
  }

  if (activityKey === 'teori') {
    const latihanStatus = activityMap.latihan?.meta?.status || 'not_started';
    if (latihanStatus !== 'passed') {
      return { allowed: false, reason: 'Ujian teori dibuka setelah latihan teori dinyatakan lulus oleh admin.' };
    }
  }

  if (activityKey === 'praktik') {
    const teoriStatus = activityMap.teori?.meta?.status || 'not_started';
    if (teoriStatus !== 'passed') {
      return { allowed: false, reason: 'Ujian praktik dibuka setelah ujian teori dinyatakan lulus oleh admin.' };
    }
  }

  return { allowed: true, reason: '' };
}

export function buildStudentClassPortal({
  user = null,
  accountReference = {},
  studentReference = {},
  accounts = [],
  students = [],
  courses = [],
  enrollments = [],
  modules = [],
  assessmentProgress = [],
  assessmentDefinitions = [],
  assessmentSubmissions = [],
  certificates = [],
  messages = [],
} = {}) {
  const student = resolveStudentByReference(students, {
    studentId: studentReference.studentId ?? user?.studentId,
    nis: studentReference.nis ?? user?.nis,
    email: studentReference.email ?? user?.email,
  }) || null;
  const account = accounts.find((item) => (
    String(item.id) === String(accountReference.accountId ?? user?.accountId)
    || String(item.studentId) === String(student?.id)
  )) || null;
  const enrollment = findEnrollmentByReference(enrollments, {
    enrollmentId: studentReference.enrollmentId ?? user?.enrollmentId ?? student?.enrollmentId,
    studentId: student?.id ?? user?.studentId,
    courseId: studentReference.courseId ?? user?.courseId ?? student?.courseId,
    program: student?.program ?? user?.program,
  }, courses);
  const course = findCourseByReference(courses, {
    courseId: enrollment?.courseId ?? studentReference.courseId ?? user?.courseId ?? student?.courseId,
    program: student?.program ?? user?.program,
  });
  const certificate = certificates.find((item) => (
    String(item.studentId) === String(student?.id)
    || String(item.enrollmentId) === String(enrollment?.id)
    || (student?.nis && item.nis === student.nis)
  )) || null;
  const normalizedDefinitions = assessmentDefinitions
    .filter((item) => (
      String(item.courseId) === String(course?.id)
      && item.isPublished !== false
    ))
    .map((item) => normalizeAssessmentDefinition(item))
    .sort((left, right) => (
      ASSESSMENT_TYPE_CONFIG.findIndex((item) => item.key === normalizeAssessmentType(left.type))
      - ASSESSMENT_TYPE_CONFIG.findIndex((item) => item.key === normalizeAssessmentType(right.type))
    ));
  const normalizedAssessments = assessmentProgress
    .filter((item) => String(item.enrollmentId) === String(enrollment?.id))
    .map((item) => ({
      ...item,
      type: normalizeAssessmentType(item.type),
      status: normalizeAssessmentProgressStatus(item.status),
    }))
    .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
  const normalizedSubmissions = assessmentSubmissions
    .filter((item) => (
      String(item.studentId) === String(student?.id)
      && String(item.enrollmentId) === String(enrollment?.id)
    ))
    .map((item) => {
      const attachment = Array.isArray(item.attachments) ? item.attachments[0] : null;
      return {
        ...item,
        type: normalizeAssessmentType(item.type),
        status: normalizeSubmissionStatus(item.status),
        answers: normalizeSubmissionAnswers(item.answers),
        fileName: item.fileName || attachment?.name || '',
        fileUrl: item.fileUrl || attachment?.url || '',
        mimeType: item.mimeType || attachment?.mimeType || '',
        fileSizeLabel: item.fileSizeLabel || attachment?.sizeLabel || '',
        feedback: item.feedback || item.notes || '',
      };
    })
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
  const assessmentSummary = summarizeAssessmentStatuses(normalizedAssessments);
  const certificateGate = buildCertificateGate({
    paymentStatus: enrollment?.paymentStatus || student?.paymentStatus,
    assessments: normalizedAssessments,
    certificate,
  });
  const courseModules = modules
    .filter((item) => String(item.courseId) === String(course?.id) && item.isPublished !== false)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  const currentModuleIndex = courseModules.findIndex((item) => String(item.id) === String(enrollment?.currentModuleId));
  const hasFullDownloadAccess = String(enrollment?.paymentStatus || student?.paymentStatus || '').toLowerCase() === 'verified';
  const normalizedModules = courseModules.map((item, index) => {
    let status = 'upcoming';

    if (enrollment?.status === 'completed') {
      status = 'completed';
    } else if (currentModuleIndex === -1) {
      status = index === 0 ? 'current' : 'upcoming';
    } else if (index < currentModuleIndex) {
      status = 'completed';
    } else if (index === currentModuleIndex) {
      status = 'current';
    }

    return {
      ...item,
      status,
      downloadable: hasFullDownloadAccess || status !== 'upcoming',
    };
  });
  const threads = Array.isArray(messages)
    ? messages
      .filter((item) => String(item.studentId) === String(student?.id))
      .map((item) => {
        const normalized = normalizeThreadMessages(item);
        return {
          ...item,
          body: normalized.body,
          messages: normalized.messages,
          responses: normalized.responses,
          updatedAt: item.updatedAt || normalized.lastMessageAt,
        };
      })
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
    : [];
  const assessmentActivities = assessmentSummary.map((summaryItem) => {
    const definition = normalizedDefinitions.find((item) => normalizeAssessmentType(item.type) === summaryItem.key) || null;
    const relatedSubmissions = normalizedSubmissions.filter((item) => normalizeAssessmentType(item.type) === summaryItem.key);
    const latestSubmission = relatedSubmissions[0] || null;
    const questionCount = Array.isArray(definition?.questions) ? definition.questions.length : 0;
    const multipleChoiceCount = Array.isArray(definition?.questions)
      ? definition.questions.filter((item) => item.kind === 'multiple_choice').length
      : 0;
    const essayCount = Array.isArray(definition?.questions)
      ? definition.questions.filter((item) => item.kind === 'essay').length
      : 0;

    return {
      key: summaryItem.key,
      label: summaryItem.label,
      definition,
      progress: summaryItem.record,
      meta: summaryItem.meta,
      latestSubmission,
      relatedSubmissions,
      questionCount,
      multipleChoiceCount,
      essayCount,
      available: Boolean(definition),
    };
  });
  const activityMap = assessmentActivities.reduce((accumulator, item) => ({
    ...accumulator,
    [item.key]: item,
  }), {});
  const paymentStatus = enrollment?.paymentStatus || student?.paymentStatus || 'pending';
  const nextActionableActivity = assessmentActivities.find((item) => {
    if (!item.available || ['passed', 'in_review'].includes(item.meta.status)) {
      return false;
    }

    return getStudentActivityAvailability(item.key, paymentStatus, activityMap).allowed;
  }) || assessmentActivities.find((item) => item.available && item.meta.status !== 'passed') || null;

  return {
    account,
    student,
    enrollment,
    course,
    certificate,
    modules: normalizedModules,
    assessments: normalizedAssessments,
    assessmentDefinitions: normalizedDefinitions,
    assessmentSubmissions: normalizedSubmissions,
    assessmentActivities,
    nextActionableActivity,
    assessmentSummary,
    certificateGate,
    threads,
    hasFullDownloadAccess,
    learning: {
      completionPercent: enrollment?.progressPercent ?? 0,
      totalModules: normalizedModules.length,
      completedModules: normalizedModules.filter((item) => item.status === 'completed').length,
      currentModule: normalizedModules.find((item) => item.status === 'current') || normalizedModules[0] || null,
    },
    paymentMeta: getAssessmentStatusMeta(
      String(paymentStatus).toLowerCase() === 'verified' ? 'passed' : 'submitted',
    ),
  };
}

export function normalizeClassworkType(value) {
  const comparableValue = normalizeComparable(value);
  const matchedConfig = CLASSWORK_TYPE_CONFIG.find((item) => (
    normalizeComparable(item.key) === comparableValue
    || normalizeComparable(item.label) === comparableValue
  ));

  return matchedConfig?.key || String(value || '').trim().toLowerCase();
}

export function getClassworkTypeConfig(type) {
  const normalizedType = normalizeClassworkType(type);
  const matchedConfig = CLASSWORK_TYPE_CONFIG.find((item) => item.key === normalizedType);

  const fallback = {
    key: normalizedType,
    label: normalizedType
      ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).replace(/_/g, ' ')
      : 'Classwork',
    bucket: normalizedType || 'classwork',
    source: 'classroom',
  };

  const resolved = matchedConfig || fallback;
  return {
    ...resolved,
    category: resolved.category || resolved.bucket || resolved.key,
  };
}

export function normalizeClassroomPost(post = {}, index = 0) {
  const createdAt = toIsoDate(post.createdAt || post.publishedAt || post.updatedAt);
  const status = String(post.status || (post.isPublished === false ? 'draft' : 'published')).toLowerCase();

  return {
    ...post,
    id: String(post.id || `classroom-post-${post.courseId || 'course'}-${index + 1}`),
    courseId: post.courseId ?? null,
    title: String(post.title || 'Pengumuman kelas'),
    body: String(post.body || post.content || ''),
    authorName: post.authorName || post.author || 'Admin LKP',
    status,
    isPublished: post.isPublished ?? status === 'published',
    attachmentName: post.attachmentName || post.fileName || '',
    attachmentUrl: post.attachmentUrl || post.fileUrl || '',
    attachmentMimeType: post.attachmentMimeType || post.mimeType || '',
    publishedAt: post.publishedAt ? toIsoDate(post.publishedAt) : (status === 'published' ? createdAt : null),
    createdAt,
    updatedAt: toIsoDate(post.updatedAt || createdAt),
  };
}

export function normalizeClassworkItem(item = {}, index = 0) {
  const typeConfig = getClassworkTypeConfig(item.type);
  const itemId = String(item.id || `classwork-item-${item.courseId || 'course'}-${typeConfig.key}-${index + 1}`);

  return {
    ...item,
    id: itemId,
    courseId: item.courseId ?? null,
    topicId: item.topicId ?? item.moduleId ?? null,
    moduleId: item.moduleId ?? item.topicId ?? null,
    moduleIds: Array.isArray(item.moduleIds) ? item.moduleIds : item.moduleId ? [item.moduleId] : [],
    type: typeConfig.key,
    title: item.title || typeConfig.label,
    summary: item.summary || item.description || '',
    description: item.description || item.summary || '',
    instructions: Array.isArray(item.instructions)
      ? item.instructions.filter(Boolean).join(' ')
      : String(item.instructions || ''),
    maxScore: Number(item.maxScore ?? (typeConfig.key === 'question' ? 20 : 100)),
    passingScore: item.passingScore == null ? null : Number(item.passingScore),
    maxAttempts: Number(item.maxAttempts ?? (typeConfig.key === 'quiz_assignment' ? 2 : 1)),
    dueAt: item.dueAt ? toIsoDate(item.dueAt) : null,
    submissionMode: item.submissionMode || (
      typeConfig.key === 'quiz_assignment'
        ? 'quiz'
        : typeConfig.key === 'question'
          ? 'answer'
          : typeConfig.key === 'material'
            ? 'material'
            : 'upload'
    ),
    orderIndex: Number(item.orderIndex ?? item.order ?? index + 1),
    isPublished: item.isPublished ?? true,
    source: item.source || typeConfig.source,
    typeMeta: typeConfig,
    resourceType: item.resourceType || '',
    materialUrl: item.materialUrl || item.fileUrl || '',
    attachmentName: item.attachmentName || item.fileName || '',
    attachmentUrl: item.attachmentUrl || item.fileUrl || '',
    attachmentMimeType: item.attachmentMimeType || item.mimeType || '',
    definitionId: item.definitionId || null,
    questions: Array.isArray(item.questions)
      ? item.questions.map((question, questionIndex) => (
        normalizeAssessmentQuestion(question, questionIndex, itemId)
      ))
      : [],
    createdAt: toIsoDate(item.createdAt),
    updatedAt: toIsoDate(item.updatedAt || item.createdAt),
  };
}

export function normalizeClassworkResult(result = {}, index = 0) {
  return {
    ...result,
    id: String(result.id || `classwork-result-${result.itemId || 'item'}-${index + 1}`),
    itemId: String(result.itemId || ''),
    enrollmentId: result.enrollmentId ?? null,
    studentId: result.studentId ?? null,
    courseId: result.courseId ?? null,
    status: normalizeAssessmentProgressStatus(result.status),
    score: result.score == null ? null : Number(result.score),
    maxScore: Number(result.maxScore ?? 100),
    feedback: result.feedback || result.notes || '',
    submittedAt: result.submittedAt ? toIsoDate(result.submittedAt) : null,
    completedAt: result.completedAt ? toIsoDate(result.completedAt) : null,
    createdAt: toIsoDate(result.createdAt || result.submittedAt || result.updatedAt),
    updatedAt: toIsoDate(result.updatedAt || result.completedAt || result.submittedAt || result.createdAt),
  };
}

export function normalizeClassworkSubmission(submission = {}, index = 0) {
  return {
    ...submission,
    id: String(submission.id || `classwork-submission-${submission.itemId || 'item'}-${index + 1}`),
    itemId: String(submission.itemId || ''),
    resultId: submission.resultId || null,
    enrollmentId: submission.enrollmentId ?? null,
    studentId: submission.studentId ?? null,
    courseId: submission.courseId ?? null,
    status: normalizeSubmissionStatus(submission.status),
    attempt: Number(submission.attempt ?? 1),
    score: submission.score == null ? null : Number(submission.score),
    maxScore: Number(submission.maxScore ?? 100),
    feedback: submission.feedback || submission.notes || '',
    reviewerName: submission.reviewerName || '',
    submittedAt: submission.submittedAt ? toIsoDate(submission.submittedAt) : null,
    reviewedAt: submission.reviewedAt ? toIsoDate(submission.reviewedAt) : null,
    answers: normalizeSubmissionAnswers(submission.answers),
    attachments: Array.isArray(submission.attachments) ? submission.attachments : [],
    createdAt: toIsoDate(submission.createdAt || submission.submittedAt || submission.updatedAt),
    updatedAt: toIsoDate(submission.updatedAt || submission.reviewedAt || submission.submittedAt || submission.createdAt),
  };
}

function buildClassroomMaterialItems(modules = [], courseId) {
  return modules
    .filter((module) => String(module.courseId) === String(courseId) && module.isPublished !== false)
    .map((module) => normalizeClassworkItem({
      id: `material-${module.id}`,
      courseId: module.courseId,
      topicId: module.id,
      moduleId: module.id,
      type: 'material',
      title: `Materi: ${module.title}`,
      summary: module.summary || '',
      description: module.summary || '',
      source: 'module',
      resourceType: module.resourceType || 'lesson',
      orderIndex: Number(module.order || 0),
      isPublished: module.isPublished ?? true,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    }));
}

function buildSystemClassworkItems(assessmentDefinitions = [], courseId) {
  return assessmentDefinitions
    .filter((definition) => (
      String(definition.courseId) === String(courseId)
      && definition.isPublished !== false
    ))
    .map((definition, index) => normalizeClassworkItem({
      id: `system-${definition.id || `${courseId}-${definition.type}`}`,
      definitionId: definition.id,
      courseId: definition.courseId,
      topicId: Array.isArray(definition.moduleIds) && definition.moduleIds.length ? definition.moduleIds[0] : null,
      moduleIds: Array.isArray(definition.moduleIds) ? definition.moduleIds : [],
      type: normalizeAssessmentType(definition.type),
      title: definition.title,
      summary: definition.description || '',
      description: definition.description || '',
      instructions: definition.instructions,
      maxScore: definition.maxScore || 100,
      passingScore: definition.passingScore || 75,
      maxAttempts: definition.maxAttempts,
      submissionMode: 'assessment',
      source: 'assessment',
      orderIndex: 1000 + index,
      isPublished: definition.isPublished ?? true,
      questions: definition.questions || [],
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    }));
}

export function buildClassroomAccessMeta(enrollment = null, course = null) {
  const paymentStatus = String(enrollment?.paymentStatus || '').toLowerCase();
  const enrollmentStatus = String(enrollment?.status || '').toLowerCase();

  if (!enrollment || !course) {
    return {
      state: 'missing',
      label: 'Belum Terdaftar',
      tone: 'muted',
      canAccess: false,
      reason: 'Siswa belum memiliki enrollment classroom yang sesuai.',
    };
  }

  if (BLOCKED_PAYMENT_STATUSES.has(paymentStatus)) {
    return {
      state: 'rejected',
      label: 'Pembayaran Ditolak',
      tone: 'danger',
      canAccess: false,
      reason: 'Akses classroom ditahan sampai status pembayaran diperbarui admin.',
    };
  }

  if (!VERIFIED_PAYMENT_STATUSES.has(paymentStatus)) {
    return {
      state: 'pending',
      label: 'Menunggu Verifikasi',
      tone: 'warning',
      canAccess: false,
      reason: 'Classroom dibuka setelah pembayaran diverifikasi admin.',
    };
  }

  if (!ACTIVE_ENROLLMENT_STATUSES.has(enrollmentStatus)) {
    return {
      state: 'inactive',
      label: 'Tidak Aktif',
      tone: 'muted',
      canAccess: false,
      reason: 'Enrollment classroom tidak aktif untuk saat ini.',
    };
  }

  return {
    state: enrollmentStatus === 'completed' ? 'completed' : 'verified',
    label: enrollmentStatus === 'completed' ? 'Alumni Terverifikasi' : 'Aktif',
    tone: 'success',
    canAccess: true,
    reason: enrollmentStatus === 'completed'
      ? 'Siswa tetap dapat melihat classroom sebagai alumni terverifikasi.'
      : 'Siswa memiliki akses penuh ke classroom.',
  };
}

export function buildClassroomRoster({
  courseId,
  courses = [],
  enrollments = [],
  students = [],
  accounts = [],
} = {}) {
  const course = findCourseByReference(courses, { courseId });
  const studentsById = new Map(students.map((student) => [String(student.id), student]));
  const accountsByStudentId = new Map(accounts.map((account) => [String(account.studentId), account]));
  const counts = {
    total: 0,
    active: 0,
    completed: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    activeMembers: 0,
  };
  const candidates = [];
  const roster = [];

  enrollments.forEach((enrollment) => {
    if (String(enrollment.courseId) !== String(course?.id)) {
      return;
    }

    const student = studentsById.get(String(enrollment.studentId)) || null;
    const account = accountsByStudentId.get(String(student?.id)) || null;
    const access = buildClassroomAccessMeta(enrollment, course);
    const enrollmentStatus = String(enrollment.status || '').toLowerCase();
    const paymentStatus = String(enrollment.paymentStatus || student?.paymentStatus || '').toLowerCase();
    const isActiveMember = enrollmentStatus === 'active' && access.canAccess;
    const entry = {
      key: enrollment.id || student?.id,
      id: enrollment.id || student?.id,
      course,
      enrollment,
      student,
      account,
      access,
      enrollmentStatus,
      paymentStatus,
      isActiveMember,
      isMemberActive: isActiveMember,
    };

    counts.total += 1;
    if (enrollmentStatus === 'active') counts.active += 1;
    if (enrollmentStatus === 'completed') counts.completed += 1;
    if (paymentStatus === 'verified') counts.verified += 1;
    if (paymentStatus === 'pending') counts.pending += 1;
    if (paymentStatus === 'rejected') counts.rejected += 1;
    if (isActiveMember) {
      counts.activeMembers += 1;
    } else {
      candidates.push(entry);
    }

    roster.push(entry);
  });

  roster.sort((left, right) => String(left.student?.name || '').localeCompare(String(right.student?.name || '')));

  return {
    course,
    roster,
    counts,
    candidates,
  };
}

export function buildClassroomTopics({
  courseId,
  modules = [],
  items = [],
} = {}) {
  const courseModules = modules
    .filter((module) => String(module.courseId) === String(courseId) && module.isPublished !== false)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  const moduleOrderById = new Map(courseModules.map((module, index) => [String(module.id), index]));
  const topicIds = new Set(courseModules.map((module) => String(module.id)));
  const sortedItems = items
    .filter((item) => String(item.courseId) === String(courseId) && item.isPublished !== false)
    .map((item, index) => normalizeClassworkItem(item, index))
    .sort((left, right) => {
      const leftTopic = String(left.topicId || left.moduleId || left.moduleIds?.[0] || '');
      const rightTopic = String(right.topicId || right.moduleId || right.moduleIds?.[0] || '');
      const leftTopicIndex = moduleOrderById.get(leftTopic) ?? Number.MAX_SAFE_INTEGER;
      const rightTopicIndex = moduleOrderById.get(rightTopic) ?? Number.MAX_SAFE_INTEGER;

      if (leftTopicIndex !== rightTopicIndex) {
        return leftTopicIndex - rightTopicIndex;
      }

      return Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    });
  const topicBuckets = new Map(courseModules.map((module) => [String(module.id), []]));
  const ungroupedItems = [];

  sortedItems.forEach((item) => {
    const topicRefs = new Set();
    const primaryTopic = String(item.topicId || item.moduleId || '');

    if (primaryTopic && topicIds.has(primaryTopic)) {
      topicRefs.add(primaryTopic);
    }

    if (Array.isArray(item.moduleIds)) {
      item.moduleIds.forEach((moduleId) => {
        const normalizedModuleId = String(moduleId);
        if (topicIds.has(normalizedModuleId)) {
          topicRefs.add(normalizedModuleId);
        }
      });
    }

    if (!topicRefs.size) {
      ungroupedItems.push(item);
      return;
    }

    topicRefs.forEach((topicRef) => {
      const bucket = topicBuckets.get(topicRef);
      if (bucket) {
        bucket.push(item);
      }
    });
  });

  const topics = courseModules.map((module) => ({
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    summary: module.summary || '',
    order: Number(module.order || 0),
    resourceType: module.resourceType || 'lesson',
    items: topicBuckets.get(String(module.id)) || [],
  }));

  return {
    topics,
    ungroupedItems,
  };
}

function summarizeGenericGradeRecords(records = []) {
  const normalizedRecords = records.map((record, index) => normalizeClassworkResult(record, index));
  const scoredRecords = normalizedRecords.filter((record) => typeof record.score === 'number');
  const statuses = normalizedRecords.map((record) => normalizeAssessmentProgressStatus(record.status));

  let aggregateStatus = 'not_started';
  if (statuses.length) {
    if (statuses.every((status) => status === 'passed')) {
      aggregateStatus = 'passed';
    } else if (statuses.includes('in_review')) {
      aggregateStatus = 'in_review';
    } else if (statuses.includes('retry')) {
      aggregateStatus = 'retry';
    } else if (statuses.includes('in_progress')) {
      aggregateStatus = 'in_progress';
    } else if (statuses.includes('passed')) {
      aggregateStatus = 'in_progress';
    }
  }

  return {
    status: aggregateStatus,
    meta: getAssessmentStatusMeta(aggregateStatus),
    score: scoredRecords.length
      ? Math.round(scoredRecords.reduce((sum, record) => sum + Number(record.score || 0), 0) / scoredRecords.length)
      : null,
    maxScore: scoredRecords.length
      ? Math.round(scoredRecords.reduce((sum, record) => sum + Number(record.maxScore || 0), 0) / scoredRecords.length)
      : null,
    completedCount: normalizedRecords.filter((record) => PASSING_STATUSES.has(normalizeAssessmentProgressStatus(record.status))).length,
    totalCount: normalizedRecords.length,
  };
}

export function buildClassroomGradebook({
  courseId,
  roster = [],
  classworkItems = [],
  classworkResults = [],
  classworkSubmissions = [],
  assessmentProgress = [],
  assessmentSubmissions = [],
} = {}) {
  const courseItems = classworkItems
    .filter((item) => String(item.courseId) === String(courseId))
    .map((item, index) => normalizeClassworkItem(item, index));
  const genericItems = courseItems.filter((item) => ['assignment', 'quiz_assignment'].includes(item.type));
  const assignmentItemIds = genericItems.filter((item) => item.type === 'assignment').map((item) => String(item.id));
  const quizItemIds = genericItems.filter((item) => item.type === 'quiz_assignment').map((item) => String(item.id));
  const normalizedResults = classworkResults
    .filter((result) => String(result.courseId) === String(courseId))
    .map((result, index) => normalizeClassworkResult(result, index));
  const resultsByEnrollment = new Map();
  normalizedResults.forEach((result) => {
    const enrollmentKey = String(result.enrollmentId || '');
    const itemKey = String(result.itemId || '');
    if (!resultsByEnrollment.has(enrollmentKey)) {
      resultsByEnrollment.set(enrollmentKey, new Map());
    }
    resultsByEnrollment.get(enrollmentKey).set(itemKey, result);
  });
  const progressByEnrollmentType = new Map();
  assessmentProgress.forEach((progress) => {
    const enrollmentKey = String(progress.enrollmentId || '');
    const typeKey = normalizeAssessmentType(progress.type);
    progressByEnrollmentType.set(`${enrollmentKey}:${typeKey}`, progress);
  });
  const pendingReviewByEnrollment = new Map();
  classworkSubmissions.forEach((submission) => {
    if (
      String(submission.courseId) !== String(courseId)
      || normalizeSubmissionStatus(submission.status) !== 'in_review'
    ) {
      return;
    }

    const enrollmentKey = String(submission.enrollmentId || '');
    pendingReviewByEnrollment.set(enrollmentKey, (pendingReviewByEnrollment.get(enrollmentKey) || 0) + 1);
  });
  assessmentSubmissions.forEach((submission) => {
    if (
      String(submission.courseId) !== String(courseId)
      || normalizeSubmissionStatus(submission.status) !== 'in_review'
    ) {
      return;
    }

    const enrollmentKey = String(submission.enrollmentId || '');
    pendingReviewByEnrollment.set(enrollmentKey, (pendingReviewByEnrollment.get(enrollmentKey) || 0) + 1);
  });
  const columns = [
    { key: 'assignment', label: 'Assignment' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'latihan', label: 'Latihan' },
    { key: 'teori', label: 'Ujian Teori' },
    { key: 'praktik', label: 'Ujian Praktik' },
    { key: 'summary', label: 'Ringkasan' },
  ];

  const rows = roster.map((member) => {
    const enrollmentId = member.enrollment?.id;
    const studentId = member.student?.id;
    const enrollmentKey = String(enrollmentId || '');
    const memberResults = resultsByEnrollment.get(enrollmentKey) || new Map();
    const assignmentSummary = summarizeGenericGradeRecords(
      assignmentItemIds
        .map((itemId) => memberResults.get(itemId))
        .filter(Boolean),
    );
    const quizSummary = summarizeGenericGradeRecords(
      quizItemIds
        .map((itemId) => memberResults.get(itemId))
        .filter(Boolean),
    );
    const systemRecords = ASSESSMENT_TYPE_CONFIG.reduce((accumulator, typeItem) => {
      const record = progressByEnrollmentType.get(`${enrollmentKey}:${typeItem.key}`) || null;

      return {
        ...accumulator,
        [typeItem.key]: record
          ? {
            ...record,
            meta: getAssessmentStatusMeta(record.status),
          }
          : {
            status: 'not_started',
            score: null,
            maxScore: 100,
            meta: getAssessmentStatusMeta('not_started'),
          },
      };
    }, {});
    const pendingReviewCount = pendingReviewByEnrollment.get(enrollmentKey) || 0;

    const completedColumns = [
      assignmentSummary.meta.status === 'passed',
      quizSummary.meta.status === 'passed',
      systemRecords.latihan.meta.status === 'passed',
      systemRecords.teori.meta.status === 'passed',
      systemRecords.praktik.meta.status === 'passed',
    ].filter(Boolean).length;

    const scoreValues = [
      assignmentSummary.score,
      quizSummary.score,
      systemRecords.latihan.score,
      systemRecords.teori.score,
      systemRecords.praktik.score,
    ].filter((value) => typeof value === 'number');

    return {
      key: enrollmentId || studentId,
      enrollmentId,
      studentId,
      studentName: member.student?.name || 'Siswa',
      paymentStatus: member.paymentStatus,
      student: member.student,
      account: member.account,
      enrollment: member.enrollment,
      access: member.access,
      assignmentScore: assignmentSummary.score,
      quizScore: quizSummary.score,
      latihanScore: systemRecords.latihan.score,
      teoriScore: systemRecords.teori.score,
      praktikScore: systemRecords.praktik.score,
      summaryScore: scoreValues.length
        ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
        : null,
      columns: {
        assignment: assignmentSummary,
        quiz: quizSummary,
        latihan: systemRecords.latihan,
        teori: systemRecords.teori,
        praktik: systemRecords.praktik,
        summary: {
          completedCount: completedColumns,
          totalCount: 5,
          pendingReviewCount,
          progressPercent: Math.round((completedColumns / 5) * 100),
        },
      },
    };
  });

  return {
    columns,
    rows,
    stats: {
      totalStudents: rows.length,
      pendingReviewCount: rows.reduce((sum, row) => sum + row.columns.summary.pendingReviewCount, 0),
      fullyCompletedCount: rows.filter((row) => row.columns.summary.completedCount === 5).length,
    },
  };
}

export function buildStudentClassroomPortal({
  user = null,
  accounts = [],
  students = [],
  courses = [],
  enrollments = [],
  modules = [],
  assessmentProgress = [],
  assessmentDefinitions = [],
  assessmentSubmissions = [],
  certificates = [],
  messages = [],
  classroomPosts = [],
  classworkItems = [],
  classworkResults = [],
  classworkSubmissions = [],
} = {}) {
  const portal = buildStudentClassPortal({
    user,
    accounts,
    students,
    courses,
    enrollments,
    modules,
    assessmentProgress,
    assessmentDefinitions,
    assessmentSubmissions,
    certificates,
    messages,
  });
  const courseId = portal.course?.id;
  const access = buildClassroomAccessMeta(portal.enrollment, portal.course);
  const rosterBundle = buildClassroomRoster({
    courseId,
    courses,
    enrollments,
    students,
    accounts,
  });
  const unifiedItems = [
    ...classworkItems.filter((item) => String(item.courseId) === String(courseId)),
    ...buildClassroomMaterialItems(modules, courseId),
    ...buildSystemClassworkItems(assessmentDefinitions, courseId),
  ].map((item, index) => normalizeClassworkItem(item, index));
  const topicBundle = buildClassroomTopics({
    courseId,
    modules,
    items: unifiedItems,
  });
  const postItems = classroomPosts
    .filter((post) => String(post.courseId) === String(courseId))
    .map((post, index) => normalizeClassroomPost(post, index))
    .filter((post) => post.isPublished)
    .sort((left, right) => new Date(right.publishedAt || right.updatedAt || 0) - new Date(left.publishedAt || left.updatedAt || 0));
  const currentResults = classworkResults
    .filter((result) => String(result.enrollmentId) === String(portal.enrollment?.id))
    .map((result, index) => normalizeClassworkResult(result, index));
  const currentSubmissions = classworkSubmissions
    .filter((submission) => String(submission.enrollmentId) === String(portal.enrollment?.id))
    .map((submission, index) => normalizeClassworkSubmission(submission, index));
  const activityMap = portal.assessmentActivities.reduce((accumulator, activity) => ({
    ...accumulator,
    [activity.key]: activity,
  }), {});
  const annotatedItems = unifiedItems.map((item) => {
    if (['latihan', 'teori', 'praktik'].includes(item.type)) {
      const activity = activityMap[item.type];
      const availability = getStudentActivityAvailability(item.type, portal.enrollment?.paymentStatus, activityMap);

      return {
        ...item,
        studentProgress: {
          status: activity?.meta?.status || 'not_started',
          score: activity?.progress?.score ?? activity?.latestSubmission?.score ?? null,
          available: access.canAccess && availability.allowed,
          reason: access.canAccess ? availability.reason : access.reason,
          latestSubmission: activity?.latestSubmission || null,
        },
      };
    }

    const result = currentResults.find((candidate) => String(candidate.itemId) === String(item.id)) || null;
    const submissionList = currentSubmissions
      .filter((candidate) => String(candidate.itemId) === String(item.id))
      .sort((left, right) => new Date(right.updatedAt || right.submittedAt || 0) - new Date(left.updatedAt || left.submittedAt || 0));

    return {
      ...item,
      studentProgress: {
        status: result?.status || 'not_started',
        score: result?.score ?? submissionList[0]?.score ?? null,
        available: access.canAccess,
        reason: access.canAccess ? '' : access.reason,
        latestSubmission: submissionList[0] || null,
      },
    };
  });
  const classroomGrades = buildClassroomGradebook({
    courseId,
    roster: rosterBundle.roster,
    classworkItems: unifiedItems,
    classworkResults,
    classworkSubmissions,
    assessmentProgress,
    assessmentSubmissions,
  });
  const currentStudentGradeRow = classroomGrades.rows.find((row) => (
    String(row.enrollment?.id) === String(portal.enrollment?.id)
  )) || null;

  return {
    ...portal,
    classroom: {
      access,
      posts: postItems,
      roster: rosterBundle.roster,
      rosterCounts: rosterBundle.counts,
      topics: topicBundle.topics.map((topic) => ({
        ...topic,
        items: annotatedItems.filter((item) => (
          String(item.topicId || item.moduleId || item.moduleIds?.[0] || '') === String(topic.id)
          || (Array.isArray(item.moduleIds) && item.moduleIds.map(String).includes(String(topic.id)))
        )),
      })),
      ungroupedItems: annotatedItems.filter((item) => (
        !topicBundle.topics.some((topic) => (
          String(item.topicId || item.moduleId || item.moduleIds?.[0] || '') === String(topic.id)
          || (Array.isArray(item.moduleIds) && item.moduleIds.map(String).includes(String(topic.id)))
        ))
      )),
      items: annotatedItems,
      grades: classroomGrades,
      currentStudentGradeRow,
    },
  };
}
