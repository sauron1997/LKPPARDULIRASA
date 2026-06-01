import { createRouteFamilyClient } from './routeClient';

const adminClient = createRouteFamilyClient('/api/v1/admin');

const DEFAULT_REGISTRATION_TREND = [
  { month: 'Jan', value: 52 },
  { month: 'Feb', value: 38 },
  { month: 'Mar', value: 82 },
  { month: 'Apr', value: 64 },
  { month: 'Mei', value: 96 },
  { month: 'Jun', value: 126 },
];

const DASHBOARD_PROGRAM_COLORS = ['#11a36a', '#2f6bff', '#f5a524', '#8a43f0', '#ef4444'];

const EMPTY_LEARNING_OPS_STATS = {
  reviewQueueCount: 0,
  retryCount: 0,
  notStartedCount: 0,
  certificateReadyToUploadCount: 0,
};

export const EMPTY_ADMIN_DASHBOARD = {
  summary: {
    totalStudents: 0,
    totalCourses: 0,
    totalCertificates: 0,
    totalBlogPosts: 0,
    unreadPublicCount: 0,
    unreadStudentCount: 0,
    pendingPayments: 0,
    reviewQueueCount: 0,
    retryCount: 0,
    notStartedCount: 0,
    certificateReadyToUploadCount: 0,
    notificationCount: 0,
  },
  registrationTrend: DEFAULT_REGISTRATION_TREND,
  programDistribution: [],
  recentEnrollments: [],
  reviewQueueTop: [],
  courseHealthTop: [],
  tasks: [],
  registrationTrendIsDefault: true,
};

function buildProgramDistribution(students = []) {
  const programMap = students.reduce((result, student) => {
    if (!student?.program) {
      return result;
    }

    result.set(student.program, (result.get(student.program) || 0) + 1);
    return result;
  }, new Map());

  const items = [...programMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const total = students.length || 1;

  return items.map((item, index) => ({
    ...item,
    percentage: Math.round((item.value / total) * 100),
    color: DASHBOARD_PROGRAM_COLORS[index % DASHBOARD_PROGRAM_COLORS.length],
  }));
}

function buildRecentEnrollments(students = []) {
  return [...students]
    .sort((left, right) => new Date(right.registrationDate) - new Date(left.registrationDate))
    .slice(0, 5);
}

function buildDashboardTasks(summary = EMPTY_ADMIN_DASHBOARD.summary) {
  return [
    {
      id: 'assessment-review',
      title: `${summary.reviewQueueCount} submission review`,
      subtitle: 'Jawaban siswa menunggu penilaian',
      badge: 'Kelas Saya',
      tone: summary.reviewQueueCount > 0 ? 'rose' : 'emerald',
    },
    {
      id: 'assessment-retry',
      title: `${summary.retryCount} checkpoint retry`,
      subtitle: 'Perlu tindak lanjut pembelajaran',
      badge: 'Evaluasi',
      tone: summary.retryCount > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'certificate-upload',
      title: `${summary.certificateReadyToUploadCount} sertifikat siap upload`,
      subtitle: 'Siswa eligible menunggu dokumen',
      badge: 'Sertifikat',
      tone: summary.certificateReadyToUploadCount > 0 ? 'amber' : 'emerald',
    },
    {
      id: 'payment',
      title: `${summary.pendingPayments} pembayaran pending`,
      subtitle: 'Perlu verifikasi pembayaran',
      badge: 'Prioritas',
      tone: 'rose',
    },
    {
      id: 'student-message',
      title: `${summary.unreadStudentCount} pesan siswa baru`,
      subtitle: 'Belum dibalas',
      badge: 'Segera',
      tone: 'amber',
    },
    {
      id: 'public-message',
      title: `${summary.unreadPublicCount} pesan publik baru`,
      subtitle: 'Perlu ditindaklanjuti',
      badge: 'Baru',
      tone: 'emerald',
    },
  ];
}

function normalizeDashboardSummary(summary = {}) {
  const normalizedSummary = {
    ...EMPTY_ADMIN_DASHBOARD.summary,
    ...summary,
  };

  normalizedSummary.notificationCount = summary.notificationCount
    ?? (
      normalizedSummary.unreadPublicCount
      + normalizedSummary.unreadStudentCount
      + normalizedSummary.reviewQueueCount
    );

  return normalizedSummary;
}

export function normalizeAdminDashboard(payload = {}) {
  const overview = payload.overview || payload;
  const learningOpsStats = {
    ...EMPTY_LEARNING_OPS_STATS,
    ...(payload.learningOps?.stats || overview.learningOps?.stats || {}),
  };
  const summary = normalizeDashboardSummary({
    ...(payload.summary || {}),
    ...(overview.summary || {}),
    reviewQueueCount: overview.summary?.reviewQueueCount ?? payload.summary?.reviewQueueCount ?? learningOpsStats.reviewQueueCount,
    retryCount: overview.summary?.retryCount ?? payload.summary?.retryCount ?? learningOpsStats.retryCount,
    notStartedCount: overview.summary?.notStartedCount ?? payload.summary?.notStartedCount ?? learningOpsStats.notStartedCount,
    certificateReadyToUploadCount: overview.summary?.certificateReadyToUploadCount ?? payload.summary?.certificateReadyToUploadCount ?? learningOpsStats.certificateReadyToUploadCount,
  });
  const programDistribution = (overview.programDistribution || payload.programDistribution || buildProgramDistribution(payload.students || [])).map((item, index) => ({
    ...item,
    color: item.color || DASHBOARD_PROGRAM_COLORS[index % DASHBOARD_PROGRAM_COLORS.length],
  }));
  const rawRegistrationTrend = overview.registrationTrend || payload.registrationTrend || null;

  return {
    summary,
    registrationTrend: rawRegistrationTrend || DEFAULT_REGISTRATION_TREND,
    programDistribution,
    recentEnrollments: overview.recentEnrollments || payload.recentEnrollments || buildRecentEnrollments(payload.students || []),
    reviewQueueTop: overview.reviewQueueTop || payload.reviewQueueTop || payload.learningOps?.reviewQueue?.slice(0, 4) || [],
    courseHealthTop: overview.courseHealthTop || payload.courseHealthTop || payload.learningOps?.courseHealth?.slice(0, 5) || [],
    tasks: overview.tasks || payload.tasks || buildDashboardTasks(summary),
    registrationTrendIsDefault: !rawRegistrationTrend,
  };
}

export async function fetchAdminDashboard() {
  return normalizeAdminDashboard(await adminClient.request('dashboard'));
}

export function fetchAdminLearningOps() {
  return adminClient.request('learning-ops');
}

export function fetchAdminStudents(filters = {}) {
  return adminClient.request('students', { params: filters });
}

export function fetchAdminStudent(studentId) {
  return adminClient.request(['students', studentId]);
}

export function updateAdminStudent(studentId, payload) {
  return adminClient.request(['students', studentId], {
    method: 'PATCH',
    body: payload,
  });
}

export function updateAdminStudentPayment(studentId, payload) {
  return adminClient.request(['students', studentId, 'payment'], {
    method: 'PATCH',
    body: payload,
  });
}
