import {
  accreditations,
  accounts as seedAccounts,
  assessmentDefinitions as seedAssessmentDefinitions,
  assessmentProgress as seedAssessmentProgress,
  assessmentSubmissions as seedAssessmentSubmissions,
  blogPosts,
  certificates,
  classroomPosts as seedClassroomPosts,
  classworkItems as seedClassworkItems,
  classworkResults as seedClassworkResults,
  classworkSubmissions as seedClassworkSubmissions,
  contactMessages,
  courses,
  enrollments as seedEnrollments,
  galleryItems,
  mockUsers,
  modules as seedModules,
  profileData,
  stats,
  studentMessages,
  students,
} from './mockData.js';
import {
  ASSESSMENT_TYPE_CONFIG,
  buildAssessmentRecordKey,
  findAssessmentDefinitionByReference,
  findCourseByReference,
  findEnrollmentByReference,
  getAssessmentTypeConfig,
  getClassworkTypeConfig,
  getCourseAliases,
  normalizeAssessmentType,
  normalizeClassroomPost,
  normalizeClassworkItem,
  normalizeClassworkResult,
  normalizeClassworkSubmission,
  normalizeThreadMessages,
  resolveStudentByReference,
} from './domainRelations.js';

function toIsoDate(value) {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parsePriceValue(priceLabel) {
  if (!priceLabel) return 0;
  return Number(String(priceLabel).replace(/[^\d]/g, '')) || 0;
}

function formatPriceLabel(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getSeedAccountRef(studentId) {
  return [...seedAccounts, ...mockUsers].find((account) => String(account.studentId) === String(studentId)) || null;
}

function createCourseDefaults() {
  const now = new Date().toISOString();

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    aliases: Array.from(new Set([...(course.aliases || []), ...getCourseAliases(course)])),
    description: course.description || '',
    icon: course.icon || 'FileText',
    priceValue: parsePriceValue(course.price),
    priceLabel: course.price || formatPriceLabel(parsePriceValue(course.price)),
    duration: course.duration || '',
    level: course.level || 'Umum',
    brochureName: course.brochureName || '',
    brochureUrl: course.brochureUrl || '',
    materials: Array.isArray(course.materials) ? course.materials : [],
    createdAt: toIsoDate(course.createdAt || now),
    updatedAt: toIsoDate(course.updatedAt || course.createdAt || now),
  }));
}

function createModuleDefaults(courseItems = createCourseDefaults()) {
  const fallbackModules = courseItems.flatMap((course) => (
    course.materials.map((title, index) => ({
      id: `mod-${course.id}-${index + 1}`,
      courseId: course.id,
      order: index + 1,
      title,
      summary: '',
      durationLabel: '',
    }))
  ));
  const sourceModules = seedModules.length ? seedModules : fallbackModules;
  const now = new Date().toISOString();

  return sourceModules
    .map((module, index) => {
      const course = findCourseByReference(courseItems, {
        courseId: module.courseId,
        program: module.program,
        courseTitle: module.courseTitle,
      });

      return {
        id: module.id || `mod-${course?.id || 'course'}-${module.order || index + 1}`,
        courseId: course?.id ?? module.courseId ?? null,
        courseTitle: course?.title || module.courseTitle || '',
        title: module.title || module.name || `Modul ${module.order || index + 1}`,
        summary: module.summary || module.description || '',
        order: module.order || index + 1,
        durationLabel: module.durationLabel || '',
        resourceType: module.resourceType || 'lesson',
        isPublished: module.isPublished ?? true,
        createdAt: toIsoDate(module.createdAt || now),
        updatedAt: toIsoDate(module.updatedAt || module.createdAt || now),
      };
    })
    .sort((left, right) => {
      if (left.courseId !== right.courseId) {
        return Number(left.courseId || 0) - Number(right.courseId || 0);
      }

      return left.order - right.order;
    });
}

function createEnrollmentDefaults(courseItems = createCourseDefaults()) {
  const normalizedSeed = seedEnrollments.map((enrollment) => {
    const student = students.find((item) => String(item.id) === String(enrollment.studentId)) || null;
    const course = findCourseByReference(courseItems, {
      courseId: enrollment.courseId ?? student?.courseId,
      program: enrollment.program || student?.program,
    });
    const registrationDate = enrollment.registrationDate || student?.registrationDate || new Date().toISOString().slice(0, 10);

    return {
      id: enrollment.id || `enr-${student?.id || Math.random().toString(36).slice(2, 8)}`,
      studentId: student?.id ?? enrollment.studentId ?? null,
      courseId: course?.id ?? enrollment.courseId ?? null,
      courseTitle: course?.title || '',
      program: enrollment.program || student?.program || course?.title || '',
      status: enrollment.status || (student?.status === 'Lulus' ? 'completed' : 'active'),
      paymentStatus: enrollment.paymentStatus || student?.paymentStatus || 'pending',
      paymentDate: enrollment.paymentDate || student?.paymentDate || null,
      registrationDate,
      startedAt: enrollment.startedAt || registrationDate,
      completedAt: enrollment.completedAt || null,
      currentModuleId: enrollment.currentModuleId || null,
      progressPercent: enrollment.progressPercent ?? 0,
      notes: enrollment.notes || '',
      createdAt: toIsoDate(enrollment.createdAt || registrationDate),
      updatedAt: toIsoDate(enrollment.updatedAt || enrollment.completedAt || registrationDate),
    };
  });

  const existingStudentIds = new Set(normalizedSeed.map((item) => String(item.studentId)));
  const derivedEnrollments = students
    .filter((student) => !existingStudentIds.has(String(student.id)))
    .map((student) => {
      const course = findCourseByReference(courseItems, {
        courseId: student.courseId,
        program: student.program,
      });
      const registrationDate = student.registrationDate || new Date().toISOString().slice(0, 10);

      return {
        id: student.enrollmentId || `enr-${student.id}`,
        studentId: student.id,
        courseId: course?.id ?? student.courseId ?? null,
        courseTitle: course?.title || '',
        program: student.program || course?.title || '',
        status: student.status === 'Lulus' ? 'completed' : 'active',
        paymentStatus: student.paymentStatus || 'pending',
        paymentDate: student.paymentDate || null,
        registrationDate,
        startedAt: registrationDate,
        completedAt: student.status === 'Lulus' ? student.paymentDate || registrationDate : null,
        currentModuleId: null,
        progressPercent: student.status === 'Lulus' ? 100 : 0,
        notes: student.notes || '',
        createdAt: toIsoDate(registrationDate),
        updatedAt: toIsoDate(student.updatedAt || registrationDate),
      };
    });

  return [...normalizedSeed, ...derivedEnrollments];
}

function createStudentDefaults(courseItems = createCourseDefaults(), enrollmentItems = createEnrollmentDefaults(courseItems)) {
  return students.map((student) => {
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: student.enrollmentId,
      studentId: student.id,
      courseId: student.courseId,
      program: student.program,
    }, courseItems);
    const course = findCourseByReference(courseItems, {
      courseId: student.courseId ?? enrollment?.courseId,
      program: student.program || enrollment?.program,
    });
    const seedAccount = getSeedAccountRef(student.id);
    const registrationDate = student.registrationDate || new Date().toISOString().slice(0, 10);
    const courseId = course?.id ?? enrollment?.courseId ?? student.courseId ?? null;
    const enrollmentId = enrollment?.id ?? student.enrollmentId ?? null;

    return {
      ...student,
      accountId: student.accountId || seedAccount?.accountId || seedAccount?.id || null,
      courseId,
      enrollmentId,
      courseIds: courseId != null ? [courseId] : [],
      enrollmentIds: enrollmentId ? [enrollmentId] : [],
      courseTitle: course?.title || enrollment?.courseTitle || '',
      phone: student.phone || '',
      address: student.address || '',
      paymentStatus: student.paymentStatus || enrollment?.paymentStatus || 'pending',
      paymentDate: student.paymentDate || enrollment?.paymentDate || null,
      registrationDate,
      notes: student.notes || '',
      createdAt: toIsoDate(student.createdAt || registrationDate),
      updatedAt: toIsoDate(student.updatedAt || registrationDate),
    };
  });
}

function createAccountDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  studentItems = createStudentDefaults(courseItems, enrollmentItems),
) {
  const mergedAccounts = [...seedAccounts];
  const seenUsernames = new Set(mergedAccounts.map((account) => String(account.username).toLowerCase()));

  mockUsers.forEach((user) => {
    const normalizedUsername = String(user.username || '').toLowerCase();
    if (!seenUsernames.has(normalizedUsername)) {
      mergedAccounts.push(user);
      seenUsernames.add(normalizedUsername);
    }
  });

  return mergedAccounts.map((account) => {
    const student = studentItems.find((item) => (
      String(item.id) === String(account.studentId)
      || item.nis === account.nis
    )) || null;
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: account.enrollmentId || student?.enrollmentId,
      studentId: account.studentId || student?.id,
      courseId: account.courseId || student?.courseId,
      program: account.program || student?.program,
    }, courseItems);
    const course = findCourseByReference(courseItems, {
      courseId: account.courseId || enrollment?.courseId || student?.courseId,
      program: account.program || student?.program || enrollment?.program,
    });
    const baseDate = account.createdAt || student?.registrationDate || new Date().toISOString();

    return {
      id: account.accountId || account.id || `acc-${account.username}`,
      username: account.username,
      password: account.password || '',
      role: account.role || 'student',
      name: account.name || account.displayName || student?.name || account.username,
      displayName: account.displayName || account.name || student?.name || account.username,
      email: account.email || student?.email || '',
      studentId: student?.id ?? account.studentId ?? null,
      nis: student?.nis || account.nis || '',
      courseId: course?.id ?? enrollment?.courseId ?? student?.courseId ?? account.courseId ?? null,
      enrollmentId: enrollment?.id ?? student?.enrollmentId ?? account.enrollmentId ?? null,
      program: student?.program || enrollment?.program || course?.title || account.program || '',
      permissions: Array.isArray(account.permissions)
        ? account.permissions
        : account.role === 'admin'
          ? ['*']
          : ['student'],
      status: account.status || 'active',
      createdAt: toIsoDate(baseDate),
      updatedAt: toIsoDate(account.updatedAt || student?.updatedAt || baseDate),
      lastLoginAt: account.lastLoginAt || null,
    };
  });
}

function getAssessmentDurationMinutes(type) {
  switch (normalizeAssessmentType(type)) {
    case 'latihan':
      return 45;
    case 'teori':
      return 60;
    case 'praktik':
      return 90;
    default:
      return 60;
  }
}

function getAssessmentInstructionDefaults(type, courseTitle) {
  const programLabel = courseTitle || 'program kursus';

  switch (normalizeAssessmentType(type)) {
    case 'latihan':
      return [
        `Selesaikan latihan mandiri yang relevan dengan materi ${programLabel}.`,
        'Lampirkan jawaban atau ringkasan langkah kerja secara singkat.',
      ];
    case 'teori':
      return [
        `Kerjakan soal teori untuk mengukur pemahaman konsep inti ${programLabel}.`,
        'Jawaban essay ditulis singkat, jelas, dan memakai istilah yang tepat.',
      ];
    case 'praktik':
      return [
        `Tunjukkan keterampilan praktik utama yang sudah dipelajari pada kelas ${programLabel}.`,
        'Unggah hasil akhir dan jelaskan proses kerja inti yang kamu lakukan.',
      ];
    default:
      return ['Ikuti instruksi assessment yang diberikan oleh admin.'];
  }
}

function getAssessmentModuleIds(moduleItems, courseId, type) {
  const relatedModules = moduleItems
    .filter((item) => String(item.courseId) === String(courseId))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));

  if (!relatedModules.length) {
    return [];
  }

  const normalizedType = normalizeAssessmentType(type);

  if (normalizedType === 'latihan') {
    return relatedModules.slice(0, Math.min(3, relatedModules.length)).map((item) => item.id);
  }

  if (normalizedType === 'praktik') {
    return relatedModules.slice(-Math.min(2, relatedModules.length)).map((item) => item.id);
  }

  return relatedModules.map((item) => item.id);
}

function createAssessmentQuestionDefaults(courseTitle, type) {
  const typeConfig = getAssessmentTypeConfig(type);
  const normalizedType = typeConfig.key;
  const programLabel = courseTitle || 'program kursus';

  if (normalizedType === 'praktik') {
    return [
      {
        id: `question-${normalizedType}-1`,
        kind: 'essay',
        prompt: `Jelaskan hasil akhir praktik utama pada kelas ${programLabel}.`,
      },
      {
        id: `question-${normalizedType}-2`,
        kind: 'essay',
        prompt: 'Ceritakan langkah kerja dan kendala yang paling menantang saat praktik.',
      },
    ];
  }

  if (normalizedType === 'teori') {
    return [
      {
        id: `question-${normalizedType}-1`,
        kind: 'multiple_choice',
        prompt: `Konsep dasar apa yang paling penting dipahami pada kelas ${programLabel}?`,
        options: [
          { id: 'a', label: 'Struktur kerja dan alur fitur', value: 'struktur_kerja' },
          { id: 'b', label: 'Warna favorit instruktur', value: 'warna_favorit' },
          { id: 'c', label: 'Nama laboratorium', value: 'nama_lab' },
        ],
        answer: 'struktur_kerja',
      },
      {
        id: `question-${normalizedType}-2`,
        kind: 'multiple_choice',
        prompt: 'Manakah pendekatan yang paling tepat saat memeriksa hasil kerja sebelum final?',
        options: [
          { id: 'a', label: 'Langsung kirim tanpa cek ulang', value: 'tanpa_cek' },
          { id: 'b', label: 'Periksa struktur, format, dan akurasi', value: 'cek_struktur' },
          { id: 'c', label: 'Ganti seluruh file dari awal', value: 'ulang_total' },
        ],
        answer: 'cek_struktur',
      },
      {
        id: `question-${normalizedType}-3`,
        kind: 'essay',
        prompt: `Rangkum pemahaman konsep inti yang dipelajari dari kelas ${programLabel}.`,
      },
    ];
  }

  return [
    {
      id: `question-${normalizedType}-1`,
      kind: 'multiple_choice',
      prompt: `Latihan mana yang paling relevan untuk mengasah materi ${programLabel}?`,
      options: [
        { id: 'a', label: 'Mengerjakan latihan terstruktur', value: 'latihan_terstruktur' },
        { id: 'b', label: 'Mengabaikan instruksi', value: 'abaikan_instruksi' },
        { id: 'c', label: 'Hanya melihat hasil teman', value: 'lihat_teman' },
      ],
      answer: 'latihan_terstruktur',
    },
    {
      id: `question-${normalizedType}-2`,
      kind: 'essay',
      prompt: 'Tuliskan ringkasan hasil latihan yang sudah kamu selesaikan.',
    },
  ];
}

function normalizeAssessmentQuestions(questions, courseTitle, type, definitionId) {
  const sourceQuestions = Array.isArray(questions) && questions.length
    ? questions
    : createAssessmentQuestionDefaults(courseTitle, type);

  return sourceQuestions.map((question, index) => ({
    id: question.id || `${definitionId}-question-${index + 1}`,
    kind: question.kind || 'essay',
    prompt: question.prompt || question.title || `Pertanyaan ${index + 1}`,
    options: Array.isArray(question.options)
      ? question.options.map((option, optionIndex) => ({
        id: option.id || `${definitionId}-question-${index + 1}-option-${optionIndex + 1}`,
        label: option.label || option.text || String(option.value || option),
        value: option.value || option.label || option.text || String(option),
      }))
      : [],
    answer: question.answer ?? null,
  }));
}

function normalizeSubmissionAnswers(answers, questions) {
  if (Array.isArray(answers) && answers.length) {
    return answers.map((answer, index) => ({
      questionId: answer.questionId || questions[index]?.id || `question-${index + 1}`,
      value: answer.value ?? answer.answer ?? answer.response ?? '',
    }));
  }

  return questions.map((question, index) => ({
    questionId: question.id || `question-${index + 1}`,
    value: question.kind === 'multiple_choice'
      ? question.answer || question.options?.[0]?.value || ''
      : `Ringkasan pengerjaan untuk ${question.prompt || `soal ${index + 1}`}.`,
  }));
}

function getSubmissionStatusFromProgress(status) {
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus === 'passed' || normalizedStatus === 'completed' || normalizedStatus === 'approved') {
    return 'reviewed';
  }

  if (normalizedStatus === 'in_review' || normalizedStatus === 'submitted') {
    return 'submitted';
  }

  if (normalizedStatus === 'in_progress' || normalizedStatus === 'retry') {
    return 'draft';
  }

  return 'draft';
}

function createAssessmentDefinitionDefaults(
  courseItems = createCourseDefaults(),
  moduleItems = createModuleDefaults(courseItems),
) {
  const seededItems = seedAssessmentDefinitions.map((item) => {
    const course = findCourseByReference(courseItems, {
      courseId: item.courseId,
      program: item.program,
      courseTitle: item.courseTitle,
      title: item.title,
    });
    const typeConfig = getAssessmentTypeConfig(item.type);
    const definitionId = item.id || `def-${course?.id || item.courseId || 'course'}-${typeConfig.key}`;
    const moduleIds = Array.isArray(item.moduleIds) && item.moduleIds.length
      ? item.moduleIds
      : item.moduleId
        ? [item.moduleId]
        : getAssessmentModuleIds(moduleItems, course?.id ?? item.courseId, typeConfig.key);

    return {
      id: definitionId,
      courseId: course?.id ?? item.courseId ?? null,
      courseTitle: course?.title || item.courseTitle || '',
      type: typeConfig.key,
      title: item.title || `${typeConfig.label} ${course?.title || ''}`.trim(),
      description: item.description || '',
      instructions: Array.isArray(item.instructions) && item.instructions.length
        ? item.instructions
        : getAssessmentInstructionDefaults(typeConfig.key, course?.title || item.courseTitle),
      durationMinutes: item.durationMinutes ?? getAssessmentDurationMinutes(typeConfig.key),
      passingScore: item.passingScore ?? 75,
      maxAttempts: item.maxAttempts ?? (typeConfig.key === 'latihan' ? 3 : 1),
      questionShuffle: item.questionShuffle ?? typeConfig.key === 'teori',
      allowRetry: item.allowRetry ?? typeConfig.key !== 'teori',
      isPublished: item.isPublished ?? true,
      moduleIds,
      questions: normalizeAssessmentQuestions(item.questions, course?.title || item.courseTitle, typeConfig.key, definitionId),
      createdAt: toIsoDate(item.createdAt || item.updatedAt || new Date().toISOString()),
      updatedAt: toIsoDate(item.updatedAt || item.createdAt || new Date().toISOString()),
    };
  });

  const existingKeys = new Set(
    seededItems.map((item) => `${item.courseId}:${normalizeAssessmentType(item.type)}`),
  );
  const synthesizedItems = [];

  courseItems.forEach((course) => {
    ASSESSMENT_TYPE_CONFIG.forEach((typeItem) => {
      const compositeKey = `${course.id}:${typeItem.key}`;
      if (existingKeys.has(compositeKey)) {
        return;
      }

      const definitionId = `def-${course.id}-${typeItem.key}`;
      synthesizedItems.push({
        id: definitionId,
        courseId: course.id,
        courseTitle: course.title,
        type: typeItem.key,
        title: `${typeItem.label} ${course.title}`,
        description: `Assessment demo frontend untuk ${course.title}.`,
        instructions: getAssessmentInstructionDefaults(typeItem.key, course.title),
        durationMinutes: getAssessmentDurationMinutes(typeItem.key),
        passingScore: 75,
        maxAttempts: typeItem.key === 'latihan' ? 3 : 1,
        questionShuffle: typeItem.key === 'teori',
        allowRetry: typeItem.key !== 'teori',
        isPublished: true,
        moduleIds: getAssessmentModuleIds(moduleItems, course.id, typeItem.key),
        questions: normalizeAssessmentQuestions([], course.title, typeItem.key, definitionId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return [...seededItems, ...synthesizedItems];
}

function createAssessmentProgressDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
) {
  const seededItems = seedAssessmentProgress.map((item) => {
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      courseId: item.courseId,
    }, courseItems);
    const typeConfig = getAssessmentTypeConfig(item.type);

    return {
      id: item.id || `asg-${item.studentId || enrollment?.studentId || 'student'}-${typeConfig.key}`,
      enrollmentId: enrollment?.id ?? item.enrollmentId ?? null,
      studentId: item.studentId ?? enrollment?.studentId ?? null,
      courseId: item.courseId ?? enrollment?.courseId ?? null,
      type: typeConfig.key,
      moduleId: item.moduleId || null,
      assessmentTitle: item.assessmentTitle || typeConfig.label,
      status: item.status || 'not_started',
      score: item.score ?? null,
      maxScore: item.maxScore || 100,
      submittedAt: item.submittedAt || null,
      completedAt: item.completedAt || null,
      notes: item.notes || item.feedback || '',
      feedback: item.feedback || item.notes || '',
      createdAt: toIsoDate(item.createdAt || item.updatedAt || enrollment?.registrationDate || new Date().toISOString()),
      updatedAt: toIsoDate(item.updatedAt || item.completedAt || item.createdAt || enrollment?.updatedAt || new Date().toISOString()),
    };
  });

  const existingKeys = new Set(seededItems.map((item) => buildAssessmentRecordKey(item)));
  const synthesizedItems = [];

  enrollmentItems.forEach((enrollment) => {
    ASSESSMENT_TYPE_CONFIG.forEach((typeItem) => {
      const compositeKey = buildAssessmentRecordKey({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        type: typeItem.key,
      });
      if (existingKeys.has(compositeKey)) {
        return;
      }

      synthesizedItems.push({
        id: `asg-${enrollment.studentId}-${typeItem.key}`,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        type: typeItem.key,
        moduleId: null,
        assessmentTitle: typeItem.label,
        status: 'not_started',
        score: null,
        maxScore: 100,
        submittedAt: null,
        completedAt: null,
        notes: '',
        feedback: '',
        createdAt: toIsoDate(enrollment.createdAt),
        updatedAt: toIsoDate(enrollment.updatedAt),
      });
    });
  });

  return [...seededItems, ...synthesizedItems];
}

function createAssessmentSubmissionDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  studentItems = createStudentDefaults(courseItems, enrollmentItems),
  assessmentItems = createAssessmentProgressDefaults(courseItems, enrollmentItems),
  definitionItems = createAssessmentDefinitionDefaults(courseItems, createModuleDefaults(courseItems)),
) {
  const seededItems = seedAssessmentSubmissions.map((item) => {
    const student = resolveStudentByReference(studentItems, {
      studentId: item.studentId,
      email: item.email,
      nis: item.nis,
    });
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: item.enrollmentId || student?.enrollmentId,
      studentId: item.studentId || student?.id,
      courseId: item.courseId || student?.courseId,
      program: item.program || student?.program,
    }, courseItems);
    const course = findCourseByReference(courseItems, {
      courseId: item.courseId || enrollment?.courseId || student?.courseId,
      program: item.program || student?.program || enrollment?.program,
    });
    const typeConfig = getAssessmentTypeConfig(item.type);
    const definition = findAssessmentDefinitionByReference(definitionItems, {
      id: item.definitionId,
      courseId: course?.id ?? item.courseId,
      type: typeConfig.key,
    });
    const submittedAt = toIsoDate(item.submittedAt || item.createdAt || item.updatedAt || enrollment?.updatedAt || new Date().toISOString());
    const questions = definition?.questions || [];

    return {
      id: item.id || `sub-${enrollment?.id || student?.id || course?.id || 'assessment'}-${typeConfig.key}-${item.attempt || 1}`,
      definitionId: definition?.id ?? item.definitionId ?? null,
      enrollmentId: enrollment?.id ?? item.enrollmentId ?? null,
      studentId: student?.id ?? item.studentId ?? enrollment?.studentId ?? null,
      courseId: course?.id ?? item.courseId ?? enrollment?.courseId ?? null,
      type: typeConfig.key,
      title: item.title || `Pengumpulan ${typeConfig.label}`,
      status: item.status || getSubmissionStatusFromProgress(item.progressStatus),
      attempt: item.attempt ?? 1,
      score: item.score ?? null,
      maxScore: item.maxScore || 100,
      submittedAt,
      reviewedAt: item.reviewedAt ? toIsoDate(item.reviewedAt) : null,
      reviewerName: item.reviewerName || '',
      notes: item.notes || '',
      answers: normalizeSubmissionAnswers(item.answers, questions),
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      createdAt: toIsoDate(item.createdAt || submittedAt),
      updatedAt: toIsoDate(item.updatedAt || item.reviewedAt || submittedAt),
    };
  });

  const existingKeys = new Set(seededItems.map((item) => buildAssessmentRecordKey(item)));
  const synthesizedItems = [];

  assessmentItems.forEach((item) => {
    const normalizedStatus = String(item.status || '').toLowerCase();
    if (normalizedStatus === 'not_started' || normalizedStatus === 'pending') {
      return;
    }

    const compositeKey = buildAssessmentRecordKey(item);
    if (existingKeys.has(compositeKey)) {
      return;
    }

    const definition = findAssessmentDefinitionByReference(definitionItems, {
      courseId: item.courseId,
      type: item.type,
    });
    const submittedAt = toIsoDate(item.submittedAt || item.updatedAt || item.createdAt || new Date().toISOString());

    synthesizedItems.push({
      id: `sub-${item.enrollmentId}-${normalizeAssessmentType(item.type)}-1`,
      definitionId: definition?.id ?? null,
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      courseId: item.courseId,
      type: normalizeAssessmentType(item.type),
      title: `Pengumpulan ${getAssessmentTypeConfig(item.type).label}`,
      status: getSubmissionStatusFromProgress(item.status),
      attempt: 1,
      score: item.score ?? null,
      maxScore: item.maxScore || 100,
      submittedAt,
      reviewedAt: normalizedStatus === 'passed' ? toIsoDate(item.updatedAt || submittedAt) : null,
      reviewerName: normalizedStatus === 'passed' ? 'Admin LKP' : '',
      notes: item.notes || item.feedback || '',
      answers: normalizeSubmissionAnswers([], definition?.questions || []),
      attachments: [],
      createdAt: toIsoDate(item.createdAt || submittedAt),
      updatedAt: toIsoDate(item.updatedAt || submittedAt),
    });
  });

  return [...seededItems, ...synthesizedItems];
}

function createScheduleSessionDefaults(courseItems = createCourseDefaults()) {
  const baseDate = new Date('2026-05-25T09:00:00.000Z');

  return courseItems.map((course, index) => {
    const startAt = new Date(baseDate.getTime() + index * 86400000);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    return {
      id: `session-${course.id}-intro`,
      courseId: course.id,
      courseTitle: course.title,
      moduleId: null,
      title: `Sesi Pembuka ${course.title}`,
      description: `Orientasi jadwal dan target belajar untuk ${course.title}.`,
      instructorName: 'Admin LKP',
      location: 'Lab Komputer LKP Parduli Rasa',
      locationLabel: 'Lab Komputer LKP Parduli Rasa',
      mode: 'offline',
      status: 'published',
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      createdAt: startAt.toISOString(),
      updatedAt: startAt.toISOString(),
    };
  });
}

function createScheduleAssignmentDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  sessionItems = createScheduleSessionDefaults(courseItems),
) {
  return sessionItems.flatMap((session) => (
    enrollmentItems
      .filter((enrollment) => String(enrollment.courseId) === String(session.courseId))
      .filter((enrollment) => String(enrollment.status || '').toLowerCase() === 'active')
      .filter((enrollment) => String(enrollment.paymentStatus || '').toLowerCase() === 'verified')
      .map((enrollment) => ({
        id: `sched-asg-${session.id}-${enrollment.id}`,
        sessionId: session.id,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        status: 'scheduled',
        assignmentStatus: 'assigned',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }))
  ));
}

function createAttendanceRecordDefaults() {
  return [];
}

function createClassroomPostDefaults(courseItems = createCourseDefaults()) {
  const seededItems = seedClassroomPosts.map((post, index) => {
    const course = findCourseByReference(courseItems, {
      courseId: post.courseId,
      program: post.program,
      courseTitle: post.courseTitle,
      title: post.title,
    });

    return normalizeClassroomPost({
      ...post,
      id: post.id || `post-${course?.id || 'course'}-${index + 1}`,
      courseId: course?.id ?? post.courseId ?? null,
    }, index);
  });
  const existingCourseIds = new Set(seededItems.map((item) => String(item.courseId)));
  const synthesizedItems = courseItems
    .filter((course) => !existingCourseIds.has(String(course.id)))
    .map((course, index) => normalizeClassroomPost({
      id: `post-${course.id}-welcome`,
      courseId: course.id,
      title: `Selamat datang di Classroom ${course.title}`,
      body: `Classroom ${course.title} sudah aktif. Admin dapat memakai tab Stream untuk membagikan pengumuman kursus dan agenda kelas.`,
      authorName: 'Admin LKP',
      status: 'published',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, index));

  return [...seededItems, ...synthesizedItems];
}

function getClassworkInstructions(courseTitle, type) {
  const label = courseTitle || 'program kursus';
  const typeKey = getClassworkTypeConfig(type).key;

  switch (typeKey) {
    case 'assignment':
      return `Kerjakan tugas praktik mandiri untuk kelas ${label} dan unggah hasil akhir beserta ringkasan proses kerja.`;
    case 'quiz_assignment':
      return `Selesaikan quiz singkat untuk memastikan pemahaman konsep inti pada kelas ${label}.`;
    case 'question':
      return `Jawab pertanyaan refleksi singkat terkait materi kelas ${label}.`;
    default:
      return `Ikuti instruksi classwork untuk kelas ${label}.`;
  }
}

function createClassworkQuestionDefaults(type, courseTitle) {
  const label = courseTitle || 'program kursus';
  const typeKey = getClassworkTypeConfig(type).key;

  if (typeKey === 'quiz_assignment') {
    return [
      {
        id: `${typeKey}-question-1`,
        kind: 'multiple_choice',
        prompt: `Bagian mana yang paling penting diperiksa sebelum hasil kerja ${label} dikumpulkan?`,
        options: [
          { id: 'a', label: 'Konsistensi struktur dan akurasi hasil', value: 'review_final' },
          { id: 'b', label: 'Nama warna favorit instruktur', value: 'warna_favorit' },
          { id: 'c', label: 'Mengganti seluruh file tanpa cek', value: 'ulang_total' },
        ],
        answer: 'review_final',
      },
    ];
  }

  if (typeKey === 'question') {
    return [
      {
        id: `${typeKey}-question-1`,
        kind: 'essay',
        prompt: `Tuliskan refleksi singkat tentang pemahaman materi terbaru pada kelas ${label}.`,
      },
    ];
  }

  return [];
}

function createClassworkItemDefaults(
  courseItems = createCourseDefaults(),
  moduleItems = createModuleDefaults(courseItems),
) {
  const seededItems = seedClassworkItems.map((item, index) => {
    const course = findCourseByReference(courseItems, {
      courseId: item.courseId,
      program: item.program,
      courseTitle: item.courseTitle,
      title: item.title,
    });
    const topicModule = moduleItems.find((module) => String(module.id) === String(item.topicId || item.moduleId)) || null;
    const typeConfig = getClassworkTypeConfig(item.type);

    return normalizeClassworkItem({
      ...item,
      id: item.id || `cwi-${course?.id || 'course'}-${typeConfig.key}-${index + 1}`,
      courseId: course?.id ?? item.courseId ?? null,
      topicId: topicModule?.id ?? item.topicId ?? item.moduleId ?? null,
      moduleId: topicModule?.id ?? item.moduleId ?? item.topicId ?? null,
      instructions: item.instructions || getClassworkInstructions(course?.title, typeConfig.key),
      questions: Array.isArray(item.questions) && item.questions.length
        ? item.questions
        : createClassworkQuestionDefaults(typeConfig.key, course?.title),
    }, index);
  });
  const existingKeys = new Set(
    seededItems.map((item) => `${item.courseId}:${getClassworkTypeConfig(item.type).key}`),
  );
  const synthesizedItems = [];

  courseItems.forEach((course) => {
    const courseModules = moduleItems
      .filter((module) => String(module.courseId) === String(course.id))
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
    const fallbackTopicId = courseModules[0]?.id || null;
    const quizTopicId = courseModules[Math.min(1, courseModules.length - 1)]?.id || fallbackTopicId;
    const questionTopicId = courseModules[Math.min(2, courseModules.length - 1)]?.id || fallbackTopicId;

    [
      { type: 'assignment', topicId: fallbackTopicId, title: `Assignment ${course.title}` },
      { type: 'quiz_assignment', topicId: quizTopicId, title: `Quiz ${course.title}` },
      { type: 'question', topicId: questionTopicId, title: `Question ${course.title}` },
    ].forEach((config, index) => {
      const compositeKey = `${course.id}:${config.type}`;
      if (existingKeys.has(compositeKey)) {
        return;
      }

      synthesizedItems.push(normalizeClassworkItem({
        id: `cwi-${course.id}-${config.type}-${index + 1}`,
        courseId: course.id,
        topicId: config.topicId,
        moduleId: config.topicId,
        type: config.type,
        title: config.title,
        summary: `Item classwork default untuk ${course.title}.`,
        instructions: getClassworkInstructions(course.title, config.type),
        maxScore: config.type === 'question' ? 20 : 100,
        passingScore: config.type === 'question' ? null : 75,
        maxAttempts: config.type === 'quiz_assignment' ? 2 : 1,
        orderIndex: index + 1,
        isPublished: true,
        questions: createClassworkQuestionDefaults(config.type, course.title),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, synthesizedItems.length));
    });
  });

  return [...seededItems, ...synthesizedItems];
}

function createClassworkResultDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  moduleItems = createModuleDefaults(courseItems),
  classworkItemItems = createClassworkItemDefaults(courseItems, moduleItems),
) {
  const seededItems = seedClassworkResults.map((item, index) => {
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      courseId: item.courseId,
    }, courseItems);
    const classworkItem = classworkItemItems.find((candidate) => String(candidate.id) === String(item.itemId)) || null;

    return normalizeClassworkResult({
      ...item,
      id: item.id || `cwr-${enrollment?.id || 'enrollment'}-${item.itemId || index + 1}`,
      itemId: classworkItem?.id ?? item.itemId ?? null,
      enrollmentId: enrollment?.id ?? item.enrollmentId ?? null,
      studentId: item.studentId ?? enrollment?.studentId ?? null,
      courseId: item.courseId ?? enrollment?.courseId ?? classworkItem?.courseId ?? null,
      maxScore: item.maxScore ?? classworkItem?.maxScore ?? 100,
    }, index);
  });
  const existingKeys = new Set(
    seededItems.map((item) => `${item.enrollmentId}:${item.itemId}`),
  );
  const synthesizedItems = [];

  enrollmentItems.forEach((enrollment) => {
    classworkItemItems
      .filter((item) => (
        String(item.courseId) === String(enrollment.courseId)
        && ['assignment', 'quiz_assignment', 'question'].includes(getClassworkTypeConfig(item.type).key)
      ))
      .forEach((item) => {
        const compositeKey = `${enrollment.id}:${item.id}`;
        if (existingKeys.has(compositeKey)) {
          return;
        }

        synthesizedItems.push(normalizeClassworkResult({
          id: `cwr-${enrollment.id}-${item.id}`,
          itemId: item.id,
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          status: 'not_started',
          score: null,
          maxScore: item.maxScore || 100,
          feedback: '',
          createdAt: enrollment.createdAt,
          updatedAt: enrollment.updatedAt,
        }, synthesizedItems.length));
      });
  });

  return [...seededItems, ...synthesizedItems];
}

function createClassworkSubmissionDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  moduleItems = createModuleDefaults(courseItems),
  classworkItemItems = createClassworkItemDefaults(courseItems, moduleItems),
  classworkResultItems = createClassworkResultDefaults(
    courseItems,
    enrollmentItems,
    moduleItems,
    classworkItemItems,
  ),
) {
  const seededItems = seedClassworkSubmissions.map((item, index) => {
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: item.enrollmentId,
      studentId: item.studentId,
      courseId: item.courseId,
    }, courseItems);
    const classworkItem = classworkItemItems.find((candidate) => String(candidate.id) === String(item.itemId)) || null;
    const relatedResult = classworkResultItems.find((result) => (
      String(result.itemId) === String(classworkItem?.id ?? item.itemId)
      && String(result.enrollmentId) === String(enrollment?.id ?? item.enrollmentId)
    )) || null;

    return normalizeClassworkSubmission({
      ...item,
      id: item.id || `cws-${enrollment?.id || 'enrollment'}-${item.itemId || index + 1}`,
      itemId: classworkItem?.id ?? item.itemId ?? null,
      resultId: item.resultId || relatedResult?.id || null,
      enrollmentId: enrollment?.id ?? item.enrollmentId ?? null,
      studentId: item.studentId ?? enrollment?.studentId ?? null,
      courseId: item.courseId ?? enrollment?.courseId ?? classworkItem?.courseId ?? null,
      maxScore: item.maxScore ?? classworkItem?.maxScore ?? 100,
    }, index);
  });
  const existingKeys = new Set(
    seededItems.map((item) => `${item.enrollmentId}:${item.itemId}`),
  );
  const synthesizedItems = [];

  classworkResultItems.forEach((result) => {
    const compositeKey = `${result.enrollmentId}:${result.itemId}`;
    if (existingKeys.has(compositeKey)) {
      return;
    }

    if (String(result.status || '').toLowerCase() === 'not_started') {
      return;
    }

    const classworkItem = classworkItemItems.find((item) => String(item.id) === String(result.itemId)) || null;
    synthesizedItems.push(normalizeClassworkSubmission({
      id: `cws-${result.enrollmentId}-${result.itemId}`,
      itemId: result.itemId,
      resultId: result.id,
      enrollmentId: result.enrollmentId,
      studentId: result.studentId,
      courseId: result.courseId,
      status: result.status === 'passed' ? 'reviewed' : result.status,
      attempt: 1,
      score: result.score,
      maxScore: result.maxScore || classworkItem?.maxScore || 100,
      feedback: result.feedback || '',
      reviewerName: result.status === 'passed' ? 'Admin LKP' : '',
      submittedAt: result.submittedAt || result.updatedAt,
      reviewedAt: result.status === 'passed' ? result.completedAt || result.updatedAt : null,
      answers: [],
      attachments: [],
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }, synthesizedItems.length));
  });

  return [...seededItems, ...synthesizedItems];
}

function createCertificateDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  studentItems = createStudentDefaults(courseItems, enrollmentItems),
) {
  return certificates.map((certificate) => {
    const student = studentItems.find((item) => (
      String(item.id) === String(certificate.studentId)
      || item.nis === certificate.nis
    )) || null;
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: certificate.enrollmentId || student?.enrollmentId,
      studentId: certificate.studentId || student?.id,
      courseId: certificate.courseId || student?.courseId,
      program: certificate.program || student?.program,
    }, courseItems);
    const course = findCourseByReference(courseItems, {
      courseId: certificate.courseId || enrollment?.courseId || student?.courseId,
      program: certificate.program || student?.program,
    });
    const issueDate = certificate.issueDate || new Date().toISOString().slice(0, 10);

    return {
      id: certificate.id,
      studentId: student?.id ?? certificate.studentId ?? null,
      enrollmentId: enrollment?.id ?? certificate.enrollmentId ?? student?.enrollmentId ?? null,
      courseId: course?.id ?? enrollment?.courseId ?? student?.courseId ?? certificate.courseId ?? null,
      nis: student?.nis || certificate.nis || '',
      studentName: certificate.studentName || student?.name || '',
      program: certificate.program || student?.program || course?.title || '',
      courseTitle: course?.title || enrollment?.courseTitle || '',
      status: certificate.status || 'available',
      issueDate,
      fileName: certificate.fileName || '',
      fileUrl: certificate.fileUrl || '',
      mimeType: certificate.mimeType || '',
      notes: certificate.notes || '',
      updatedAt: toIsoDate(certificate.updatedAt || issueDate),
    };
  });
}

function buildResponseItem(body, createdAt) {
  return {
    id: `${Math.random().toString(36).slice(2, 10)}`,
    body,
    createdAt,
    authorName: 'Admin LKP',
  };
}

function createStudentMessageDefaults(
  courseItems = createCourseDefaults(),
  enrollmentItems = createEnrollmentDefaults(courseItems),
  studentItems = createStudentDefaults(courseItems, enrollmentItems),
) {
  return studentMessages.map((thread) => {
    const student = studentItems.find((item) => String(item.id) === String(thread.studentId)) || null;
    const enrollment = findEnrollmentByReference(enrollmentItems, {
      enrollmentId: thread.enrollmentId || student?.enrollmentId,
      studentId: thread.studentId || student?.id,
      courseId: thread.courseId || student?.courseId,
      program: thread.program || student?.program,
    }, courseItems);
    const course = findCourseByReference(courseItems, {
      courseId: thread.courseId || enrollment?.courseId || student?.courseId,
      program: thread.program || student?.program || enrollment?.program,
    });
    const createdAt = toIsoDate(thread.createdAt || thread.date);
    const normalizedThread = normalizeThreadMessages({ ...thread, createdAt });

    return {
      id: thread.id,
      channel: 'student',
      threadType: thread.threadType || 'consultation',
      studentId: student?.id ?? thread.studentId ?? null,
      enrollmentId: enrollment?.id ?? thread.enrollmentId ?? student?.enrollmentId ?? null,
      courseId: course?.id ?? enrollment?.courseId ?? student?.courseId ?? thread.courseId ?? null,
      courseTitle: course?.title || enrollment?.courseTitle || '',
      senderName: thread.studentName || thread.senderName || student?.name || 'Siswa',
      subject: thread.subject || 'Konsultasi Siswa',
      body: normalizedThread.body,
      message: normalizedThread.message,
      status: thread.status === 'replied' ? 'replied' : 'unread',
      createdAt,
      responses: normalizedThread.responses,
      messages: normalizedThread.messages,
      draft: thread.draft || '',
      lastMessageAt: normalizedThread.lastMessageAt,
      updatedAt: toIsoDate(thread.updatedAt || normalizedThread.lastMessageAt || createdAt),
    };
  });
}

export function getDefaultStudents() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  return createStudentDefaults(courseItems, enrollmentItems);
}

export function getDefaultCertificates() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const studentItems = createStudentDefaults(courseItems, enrollmentItems);
  return createCertificateDefaults(courseItems, enrollmentItems, studentItems);
}

export function getDefaultScheduleSessions() {
  const courseItems = createCourseDefaults();
  return createScheduleSessionDefaults(courseItems, createModuleDefaults(courseItems));
}

export function getDefaultScheduleAssignments() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  return createScheduleAssignmentDefaults(courseItems, enrollmentItems, createScheduleSessionDefaults(courseItems));
}

export function getDefaultAttendanceRecords() {
  return createAttendanceRecordDefaults();
}

export function getDefaultAccounts() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const studentItems = createStudentDefaults(courseItems, enrollmentItems);
  return createAccountDefaults(courseItems, enrollmentItems, studentItems);
}

export function getDefaultEnrollments() {
  const courseItems = createCourseDefaults();
  return createEnrollmentDefaults(courseItems);
}

export function getDefaultModules() {
  const courseItems = createCourseDefaults();
  return createModuleDefaults(courseItems);
}

export function getDefaultAssessmentProgress() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  return createAssessmentProgressDefaults(courseItems, enrollmentItems);
}

export function getDefaultAssessmentDefinitions() {
  const courseItems = createCourseDefaults();
  const moduleItems = createModuleDefaults(courseItems);
  return createAssessmentDefinitionDefaults(courseItems, moduleItems);
}

export function getDefaultAssessmentSubmissions() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const studentItems = createStudentDefaults(courseItems, enrollmentItems);
  const assessmentItems = createAssessmentProgressDefaults(courseItems, enrollmentItems);
  const moduleItems = createModuleDefaults(courseItems);
  const definitionItems = createAssessmentDefinitionDefaults(courseItems, moduleItems);

  return createAssessmentSubmissionDefaults(
    courseItems,
    enrollmentItems,
    studentItems,
    assessmentItems,
    definitionItems,
  );
}

export function getDefaultPublicMessages() {
  return contactMessages.map((message) => {
    const createdAt = toIsoDate(message.date);
    return {
      id: message.id,
      channel: 'public',
      senderName: message.name,
      senderEmail: message.email,
      senderAddress: message.address || '',
      subject: 'Pesan dari halaman kontak',
      body: message.message,
      status: message.status === 'replied' ? 'replied' : 'unread',
      createdAt,
      responses: message.response ? [buildResponseItem(message.response, createdAt)] : [],
      draft: '',
      updatedAt: createdAt,
    };
  });
}

export function getDefaultStudentMessages() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const studentItems = createStudentDefaults(courseItems, enrollmentItems);
  return createStudentMessageDefaults(courseItems, enrollmentItems, studentItems);
}

export function getDefaultClassroomPosts() {
  const courseItems = createCourseDefaults();
  return createClassroomPostDefaults(courseItems);
}

export function getDefaultClassworkItems() {
  const courseItems = createCourseDefaults();
  const moduleItems = createModuleDefaults(courseItems);
  return createClassworkItemDefaults(courseItems, moduleItems);
}

export function getDefaultClassworkResults() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const moduleItems = createModuleDefaults(courseItems);
  const classworkItemItems = createClassworkItemDefaults(courseItems, moduleItems);
  return createClassworkResultDefaults(courseItems, enrollmentItems, moduleItems, classworkItemItems);
}

export function getDefaultClassworkSubmissions() {
  const courseItems = createCourseDefaults();
  const enrollmentItems = createEnrollmentDefaults(courseItems);
  const moduleItems = createModuleDefaults(courseItems);
  const classworkItemItems = createClassworkItemDefaults(courseItems, moduleItems);
  const classworkResultItems = createClassworkResultDefaults(
    courseItems,
    enrollmentItems,
    moduleItems,
    classworkItemItems,
  );

  return createClassworkSubmissionDefaults(
    courseItems,
    enrollmentItems,
    moduleItems,
    classworkItemItems,
    classworkResultItems,
  );
}

export function getDefaultCourses() {
  const courseItems = createCourseDefaults();
  const moduleItems = createModuleDefaults(courseItems);

  return courseItems.map((course) => {
    const relatedModules = moduleItems.filter((module) => String(module.courseId) === String(course.id));

    return {
      ...course,
      moduleIds: relatedModules.map((module) => module.id),
      moduleCount: relatedModules.length,
    };
  });
}

export function getDefaultGalleryItems() {
  return galleryItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    tags: item.tags || ['Kursus Komputer'],
    media: item.media || (item.image ? [{
      id: `${item.id}-cover`,
      name: item.title,
      type: item.type === 'video' ? 'video' : 'photo',
      url: item.image,
      isObjectUrl: false,
    }] : []),
    coverId: item.coverId || (item.media?.[0]?.id || (item.image ? `${item.id}-cover` : '')),
    type: item.type || 'photo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function getDefaultBlogPosts() {
  return blogPosts.map((post) => ({
    id: post.id,
    slug: post.slug || slugify(post.title),
    title: post.title,
    summary: post.summary || '',
    content: post.content || '',
    author: post.author || 'Admin LKP',
    image: post.image || '',
    tags: post.tags || (post.category ? [post.category] : []),
    category: post.category || 'Edukasi',
    status: post.status || 'published',
    publishedAt: toIsoDate(post.date),
    createdAt: toIsoDate(post.date),
    updatedAt: toIsoDate(post.date),
  }));
}

export function getDefaultAccreditations() {
  return accreditations.map((item) => ({
    id: item.id,
    title: item.title || '',
    certificateNumber: item.certificateNumber || item.certificateNo || '',
    description: item.description || '',
    expiryDate: item.expiryDate || '',
    year: String(item.year || ''),
    status: item.status || 'Aktif',
    documentUrl: item.documentUrl || item.document || '',
    documentName: item.documentName || item.fileName || '',
    updatedAt: toIsoDate(item.expiryDate),
  }));
}

export function getDefaultProfile() {
  const alumniStat = stats.find((item) => item.label === 'Alumni');
  const teacherStat = stats.find((item) => item.label === 'Pengajar');

  return {
    name: profileData.name || 'LKP Parduli Rasa Komputer',
    tagline: profileData.tagline || '',
    logo: profileData.logo || '',
    description: profileData.description || '',
    vision: profileData.vision || '',
    mission: Array.isArray(profileData.mission) ? profileData.mission : [],
    history: profileData.history || '',
    address: profileData.address || '',
    phone: profileData.phone || '',
    email: profileData.email || '',
    foundedYear: profileData.foundedYear || 2015,
    teacherCount: profileData.teacherCount || teacherStat?.value || 15,
    alumniCount: profileData.alumniCount || alumniStat?.value || 500,
    socialMedia: {
      facebook: {
        url: profileData.socialMedia?.facebook || '',
        enabled: Boolean(profileData.socialMedia?.facebook),
      },
      instagram: {
        url: profileData.socialMedia?.instagram || '',
        enabled: Boolean(profileData.socialMedia?.instagram),
      },
      youtube: {
        url: profileData.socialMedia?.youtube || '',
        enabled: Boolean(profileData.socialMedia?.youtube),
      },
      twitter: {
        url: profileData.socialMedia?.twitter || '',
        enabled: Boolean(profileData.socialMedia?.twitter),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getPublicSocialLinks(profile) {
  const socialMedia = profile?.socialMedia || {};

  return {
    facebook: socialMedia.facebook || { url: '', enabled: false },
    instagram: socialMedia.instagram || { url: '', enabled: false },
    youtube: socialMedia.youtube || { url: '', enabled: false },
    twitter: socialMedia.twitter || { url: '', enabled: false },
  };
}

export function getProgramOptions(courseItems) {
  return courseItems.map((course) => course.title);
}
