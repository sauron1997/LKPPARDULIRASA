/**
 * Dashboard Query Use Case — aggregates learning ops + admin dashboard payload.
 * Pure domain logic: no Express, no DB driver dependencies.
 * All methods are async-compatible for both memory and Drizzle repos.
 */
export function createDashboardQuery(deps) {
  const {
    studentRepo, courseRepo, enrollmentRepo,
    scheduleSessionRepo, scheduleAssignmentRepo,
    attendanceRepo, certificateRepo,
    assessmentRepo, messageRepo, blogRepo,
  } = deps;

  const ASSESSMENT_TYPES = ['latihan', 'teori', 'praktik'];
  const toKey = (v) => String(v ?? '');
  const parseDate = (v) => v ? new Date(v) : null;
  const daysSince = (v) => {
    const d = parseDate(v);
    return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : 0;
  };
  const formatAge = (v) => {
    const days = daysSince(v);
    if (days <= 0) return 'Hari ini';
    if (days === 1) return '1 hari lalu';
    return `${days} hari lalu`;
  };

  async function buildLearningOps() {
    const [enrollments, students, courses, definitions, allProgress, allSubmissions, sessions, assignments, records, certs] = await Promise.all([
      enrollmentRepo.list(),
      studentRepo.list(),
      courseRepo.list(),
      assessmentRepo.listDefinitions(),
      assessmentRepo.listProgress(),
      assessmentRepo.listSubmissions(),
      scheduleSessionRepo.list(),
      scheduleAssignmentRepo.listAll(),
      attendanceRepo.list(),
      certificateRepo.list(),
    ]);

    const references = enrollments.length
      ? enrollments.map((e) => ({ enrollmentId: e.id, studentId: e.studentId, courseId: e.courseId }))
      : students.map((s) => ({ enrollmentId: s.enrollmentId, studentId: s.id, courseId: s.courseId }));

    const courseHealthMap = new Map(courses.map((c) => [toKey(c.id), {
      course: c, activeStudents: 0, progressTotal: 0, reviewCount: 0, retryCount: 0, eligibleCount: 0,
      publishedAssessmentCount: definitions.filter((d) => toKey(d.courseId) === toKey(c.id) && d.isPublished !== false).length,
    }]));

    const classBundles = [];
    const reviewQueue = [];
    const retryQueue = [];
    const certificateQueue = [];
    const blockedByPayment = [];

    references.forEach((ref) => {
      const student = students.find((s) => toKey(s.id) === toKey(ref.studentId));
      const enrollment = enrollments.find((e) => toKey(e.id) === toKey(ref.enrollmentId));
      const course = courses.find((c) => toKey(c.id) === toKey(ref.courseId));
      if (!student || !course) return;

      const progress = allProgress.filter((p) => toKey(p.enrollmentId) === toKey(ref.enrollmentId));
      const submissions = allSubmissions.filter((s) => toKey(s.enrollmentId) === toKey(ref.enrollmentId));
      const cert = certs.find((c) => toKey(c.studentId) === toKey(student.id));

      const completionPercent = enrollment?.progressPercent ??0;
      const reviewCount = submissions.filter((s) => s.status === 'in_review').length;
      const retryCount = progress.filter((p) => p.status === 'retry').length;
      const notStartedCount = ASSESSMENT_TYPES.length - progress.length;

      const allPassed = ASSESSMENT_TYPES.every((type) =>
        progress.some((p) => p.type === type && p.status === 'passed')
      );
      const paymentVerified = toKey(enrollment?.paymentStatus || student.paymentStatus || '').toLowerCase() === 'verified';
      const eligible = allPassed && paymentVerified;
      const downloadReady = Boolean(cert?.fileMediaId || cert?.fileUrl);

      const bundle = {
        student, enrollment, course, completionPercent,
        reviewCount, retryCount, notStartedCount,
        submissions, progress,
        gate: { eligible, downloadReady, allPassed, paymentVerified },
      };

      classBundles.push(bundle);
      const health = courseHealthMap.get(toKey(course.id));
      if (health) {
        health.activeStudents += 1;
        health.progressTotal += completionPercent;
        health.reviewCount += reviewCount;
        health.retryCount += retryCount;
        if (eligible) health.eligibleCount += 1;
      }

      submissions.filter((s) => s.status === 'in_review').forEach((sub) => {
        reviewQueue.push({
          id: sub.id, bundle, submission: sub,student, course, enrollment,ageLabel: formatAge(sub.submittedAt || sub.updatedAt),
          ageDays: daysSince(sub.submittedAt || sub.updatedAt),
        });
      });

      progress.filter((p) => p.status === 'retry').forEach((act) => {
        retryQueue.push({ bundle, activity: act });
      });

      if (eligible && !downloadReady) certificateQueue.push(bundle);
      if (!paymentVerified) blockedByPayment.push(bundle);
    });

    reviewQueue.sort((a, b) => b.ageDays - a.ageDays);

    const unpublishedDefinitions = courses.flatMap((c) =>ASSESSMENT_TYPES.map((type) => {
        const def = definitions.find((d) => toKey(d.courseId) === toKey(c.id) && d.type === type);
        return (!def || def.isPublished === false) ? { course: c, type } : null;
      }).filter(Boolean)
    );

    const courseHealth = [...courseHealthMap.values()].map((h) => ({
      course: h.course,
      activeStudents: h.activeStudents,
      averageProgress: h.activeStudents ? Math.round(h.progressTotal / h.activeStudents) : 0,
      publishedAssessmentCount: h.publishedAssessmentCount,
      reviewCount: h.reviewCount, retryCount: h.retryCount, eligibleCount: h.eligibleCount,
    })).sort((a, b) => (b.reviewCount + b.retryCount) - (a.reviewCount + a.retryCount));

    const nowTime = Date.now();
    const weekAhead = nowTime + 7 * 86400000;
    const recentWindow = nowTime - 7 * 86400000;

    const upcomingSessions = sessions.filter((s) => {
      const t = parseDate(s.startAt)?.getTime() || 0;
      return s.status !== 'cancelled' && t >= nowTime && t <= weekAhead;
    });
    const completedSessions = sessions.filter((s) =>
      s.status === 'completed' || (parseDate(s.endAt)?.getTime() || 0) < nowTime
    );
    const pendingAttendanceSessions = completedSessions.filter((s) => {
      const sAssign = assignments.filter((a) => toKey(a.sessionId) === toKey(s.id));
      const sRecords = records.filter((r) => toKey(r.sessionId) === toKey(s.id));
      return sAssign.length > sRecords.length;
    });
    const recentRecords = records.filter((r) =>
      (parseDate(r.markedAt || r.checkInAt)?.getTime() || 0) >= recentWindow
    );
    const attendanceRate7d = recentRecords.length
      ? Math.round((recentRecords.filter((r) => ['present', 'late', 'excused'].includes(r.status)).length / recentRecords.length) * 100)
      : 0;
    const riskMap = new Map();
    recentRecords.forEach((r) => {
      if (r.status === 'absent' || r.status === 'late') {
        riskMap.set(toKey(r.enrollmentId), (riskMap.get(toKey(r.enrollmentId)) || 0) + 1);
      }
    });
    const atRiskStudentsCount = [...riskMap.values()].filter((c) => c >= 2).length;

    return {
      classBundles, reviewQueue, retryQueue, certificateQueue, blockedByPayment,
      unpublishedDefinitions, courseHealth,
      scheduleHealth: {
        upcomingSessions, pendingAttendanceSessions,
        attendanceRate7d, atRiskStudentsCount,
      },
      stats: {
        reviewQueueCount: reviewQueue.length,
        retryCount: retryQueue.length,
        notStartedCount: classBundles.reduce((s, b) => s + b.notStartedCount, 0),
        eligibleCertificateCount: classBundles.filter((b) => b.gate.eligible).length,
        certificateReadyToUploadCount: certificateQueue.length,
        certificateUploadedCount: classBundles.filter((b) => b.gate.downloadReady).length,
        assessmentUnpublishedCount: unpublishedDefinitions.length,
        blockedByPaymentCount: blockedByPayment.length,
        upcomingSessionsCount: upcomingSessions.length,
        pendingAttendanceMarkingCount: pendingAttendanceSessions.length,
        attendanceRate7d, atRiskStudentsCount,
      },
    };
  }

  async function buildDashboard() {
    const learningOps = await buildLearningOps();
    const [courses, certs, blogs, publicMessages, studentMessages] = await Promise.all([
      courseRepo.list(),
      certificateRepo.list(),
      blogRepo.list(),
      messageRepo.listPublic(),
      messageRepo.listStudent(),
    ]);

    const unreadPublicCount = publicMessages.filter((m) => m.status === 'unread').length;
    const unreadStudentCount = studentMessages.filter((m) => m.status === 'unread').length;
    const pendingPayments = learningOps.classBundles.filter((b) =>
      toKey(b.enrollment?.paymentStatus || b.student.paymentStatus || '').toLowerCase() === 'pending'
    ).length;

    const recentEnrollments = [...learningOps.classBundles]
      .sort((a, b) => new Date(b.student.registrationDate ||0) - new Date(a.student.registrationDate || 0))
      .slice(0, 5)
      .map((b) => ({
        id: b.student.id, name: b.student.name,nis: b.student.nis || '',
        courseId: b.course?.id || null, program: b.course?.title || b.student.program || '',
        status: b.student.status,
        paymentStatus: b.enrollment?.paymentStatus || b.student.paymentStatus || 'pending',
        registrationDate: b.student.registrationDate || b.student.createdAt || b.enrollment?.createdAt || null,
      }));

    const programMap = new Map();
    learningOps.classBundles.forEach((b) => {
      const name = b.course?.title || b.student.program || 'Program';
      programMap.set(name, (programMap.get(name) || 0) + 1);
    });
    const total = learningOps.classBundles.length;
    const programDistribution = [...programMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({ ...item, percentage: total ? Math.round((item.value / total) * 100) : 0 }));

    return {
      summary: {
        totalStudents: total, totalCourses: courses.length,
        totalCertificates: certs.length, totalBlogPosts: blogs.length,
        unreadPublicCount, unreadStudentCount, pendingPayments,
        ...learningOps.stats,
      },
      recentEnrollments, programDistribution,
      reviewQueueTop: learningOps.reviewQueue.slice(0, 4),
      courseHealthTop: learningOps.courseHealth.slice(0, 5),
      scheduleHealth: learningOps.scheduleHealth,};
  }

  return { buildLearningOps, buildDashboard };
}