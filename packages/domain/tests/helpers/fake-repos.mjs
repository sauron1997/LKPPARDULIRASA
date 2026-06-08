/**
 * Fake Repository Implementations for Domain Use Case Tests.
 * Each fake is a minimal in-memory implementation of the repository interface.
 */

function toKey(v) { return String(v ?? ''); }

function createFakeArrayRepo(seed = []) {
  let items = [...seed];

  // Use cases may call methods with or without await — return values that
  // work both ways. Some use cases call .map() directly on the return value
  // (expecting sync), so we return plain arrays for list methods.
  const repo = {
    list() { return [...items]; },
    getById(id) { return items.find((i) => toKey(i.id) === toKey(id)) || null; },
    insert(record) { items.unshift({ ...record }); return { ...record }; },
    update(id, updater) {
      let updated = null;
      items = items.map((i) => {
        if (toKey(i.id) !== toKey(id)) return i;
        updated = typeof updater === 'function' ? updater({ ...i }) : { ...i, ...updater };
        return updated;
      });
      return updated;
    },
    remove(id) {
      const existing = items.find((i) => toKey(i.id) === toKey(id)) || null;
      items = items.filter((i) => toKey(i.id) !== toKey(id));
      return existing;
    },
    listByStudentId(studentId) { return items.filter((i) => toKey(i.studentId) === toKey(studentId)); },
    getByStudentId(studentId) { return items.find((i) => toKey(i.studentId) === toKey(studentId)) || null; },
    listByCourseId(courseId) { return items.filter((i) => toKey(i.courseId) === toKey(courseId)); },
    listByEnrollmentId(enrollmentId) { return items.filter((i) => toKey(i.enrollmentId) === toKey(enrollmentId)); },
    getByEnrollmentId(enrollmentId) { return items.find((i) => toKey(i.enrollmentId) === toKey(enrollmentId)) || null; },
    listBySessionId(sessionId) { return items.filter((i) => toKey(i.sessionId) === toKey(sessionId)); },
    listAll() { return [...items]; },
    removeBySessionId(sessionId) { items = items.filter((i) => toKey(i.sessionId) !== toKey(sessionId)); },
    findByIdentifier(identifier) {
      const norm = String(identifier || '').trim().toLowerCase();
      return items.find((i) =>
        toKey(i.email).toLowerCase() === norm
        || toKey(i.username).toLowerCase() === norm
        || toKey(i.loginId).toLowerCase() === norm
        || toKey(i.nis) === norm,
      ) || null;
    },
    // raw access for test assertions
    _raw() { return items; },
    _reset(data = []) { items = [...data]; },
  };

  return repo;
}

export function createFakeStudentRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeAccountRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeEnrollmentRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeCourseRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeCertificateRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeScheduleSessionRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeScheduleAssignmentRepo(seed = []) { return createFakeArrayRepo(seed); }
export function createFakeAttendanceRepo(seed = []) { return createFakeArrayRepo(seed); }

export function createFakeProfileRepo(profile = {}) {
  let data = { ...profile };
  return {
    async get() { return { ...data }; },
    async update(updater) {
      data = typeof updater === 'function' ? updater({ ...data }) : { ...data, ...updater };
      return { ...data };
    },
  };
}

/**
 * Build a standard set of fake deps for testing.
 */
export function buildFakeDeps(options = {}) {
  const now = new Date().toISOString();
  // Use numeric course id so Number(courseId) coercions work in schedule use cases
  const course = { id: 1, title: 'Kursus Komputer', status: 'active', price: '500000', createdAt: now, updatedAt: now };
  const student = { id: 1, nis: 'PRK-2024-001', name: 'Budi Santoso', email: 'budi@test.com', phone: '08123456789', address: 'Jl. Test 1', status: 'Aktif', courseId: 1, enrollmentId: 'enr-1', createdAt: now, updatedAt: now };
  const enrollment = { id: 'enr-1', studentId: 1, courseId: 1, program: 'Kursus Komputer', status: 'active', paymentStatus: 'verified', registrationDate: now.slice(0, 10), startedAt: now.slice(0, 10), createdAt: now, updatedAt: now };
  const account = { id: 'acc-1', email: 'budi@test.com', username: 'budi@test.com', loginId: 'budi@test.com', password: 'hashed', role: 'student', studentId: 1, nis: 'PRK-2024-001', name: 'Budi Santoso', status: 'active', createdAt: now, updatedAt: now };

  const scheduleAssignmentRepo = createFakeScheduleAssignmentRepo(options.assignments ?? []);
  const attendanceRepo = createFakeAttendanceRepo(options.attendance ?? []);

  return {
    studentRepo: createFakeStudentRepo(options.students ?? [student]),
    accountRepo: createFakeAccountRepo(options.accounts ?? [account]),
    enrollmentRepo: createFakeEnrollmentRepo(options.enrollments ?? [enrollment]),
    courseRepo: createFakeCourseRepo(options.courses ?? [course]),
    certificateRepo: createFakeCertificateRepo(options.certificates ?? []),
    scheduleSessionRepo: createFakeScheduleSessionRepo(options.sessions ?? []),
    scheduleAssignmentRepo,
    // Some use cases reference as "assignmentRepo"
    assignmentRepo: scheduleAssignmentRepo,
    attendanceRepo,
    // Some use cases reference as "attendanceRecordRepo"
    attendanceRecordRepo: attendanceRepo,
    profileRepo: createFakeProfileRepo(options.profile ?? { name: 'LKP Parduli Rasa' }),
    // seed data for assertions
    _seed: { course, student, enrollment, account },
  };
}
