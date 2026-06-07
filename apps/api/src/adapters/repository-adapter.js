/**
 * Repository Adapter — bridges existing createBackendContext repositories * to the repository interface expected by packages/domain use cases.
 *
 * This adapts the in-memory callback-style repos from admin.service.js * into simple CRUD interfaces that the use cases consume.
 */

export function createRepoAdapter(backendContext) {
 const { repositories, getIndexes, getCollections } = backendContext;
 const indexes = getIndexes();

 /**
 * Wraps an in-memory repo (raw/insert/update/remove) into a CRUD interface.
 */
 function wrapRepo(repo, repoIndexes, fieldMaps = {}) {
 const raw = () => repo.raw();
 const list = () => repo.list ? repo.list() : repo.raw();
 const getById = (id) => repo.list ? repo.list().find((r) => String(r.id) === String(id)) || null : null;
 const insert = (record, opts) => repo.insert(record, opts);
 const update = (id, recordOrFn) => {
 if (typeof recordOrFn === 'function') {
 const existing = getById(id);
 if (existing) repo.update(id, recordOrFn(existing));
 } else {
 repo.update(id, () => recordOrFn);
 }
 return getById(id);
 };
 const remove = (id) => repo.remove(id);

 const lookup = {};
 if (fieldMaps.studentId) {
 lookup.getByStudentId = (studentId) =>
 list().find((r) => String(r.studentId) === String(studentId)) || null;
 }
 if (fieldMaps.courseId) {
 lookup.listByCourseId = (courseId) =>
 list().filter((r) => String(r.courseId) === String(courseId));
 lookup.getByCourseId = (courseId) =>
 lookup.listByCourseId(courseId)[0] || null;
 }
 if (fieldMaps.enrollmentId) {
 lookup.listByEnrollmentId = (enrollmentId) =>
 list().filter((r) => String(r.enrollmentId) === String(enrollmentId));
 }
 if (fieldMaps.sessionId) {
 lookup.listBySessionId = (sessionId) =>
 list().filter((r) => String(r.sessionId) === String(sessionId));
 }

 return { raw, list, getById, insert, update, remove, ...lookup };
 }

 const courseRepo = wrapRepo(repositories.courses, {}, { courseId: true, studentId: true });
 courseRepo.listModules = (courseId) => {
 const modules = getCollections().modules || [];
 return modules.filter((m) => String(m.courseId) === String(courseId));
 };

 const studentRepo = wrapRepo(repositories.students, indexes, { studentId: true, courseId: true });

 const accountRepo = wrapRepo(repositories.accounts, indexes, { studentId: true });
 accountRepo.list = () => repositories.accounts.raw();

 const enrollmentRepo = wrapRepo(repositories.enrollments, indexes, { studentId: true, courseId: true });
 enrollmentRepo.listByStudentId = (studentId) =>
 enrollmentRepo.list().filter((e) => String(e.studentId) === String(studentId));

 const scheduleSessionRepo = wrapRepo(repositories.scheduleSessions, {}, { courseId: true });

 const scheduleAssignmentRepo = wrapRepo(repositories.scheduleAssignments, {}, { sessionId: true, enrollmentId: true });
 scheduleAssignmentRepo.listAll = () => repositories.scheduleAssignments.raw();
 scheduleAssignmentRepo.removeBySessionId = (sessionId) => {
 const assignments = repositories.scheduleAssignments.raw().filter(
 (a) => String(a.sessionId) === String(sessionId)
 );
 assignments.forEach((a) => repositories.scheduleAssignments.remove(a.id));
 };

 const attendanceRepo = wrapRepo(repositories.attendanceRecords, {}, { sessionId: true, enrollmentId: true });

 const certificateRepo = wrapRepo(repositories.certificates, {}, { studentId: true, courseId: true });

 const blogRepo = wrapRepo(repositories.blogPosts, {}, {});
 const galleryRepo = wrapRepo(repositories.galleryItems, {}, {});
 const profileRepo = { get: () => repositories.profile.get(), update: (data) => repositories.profile.update(data) };
 const accreditationRepo = wrapRepo(repositories.accreditations, {}, {});

 const paymentSettingsRepo = {
 get: () => {
 const collections = getCollections();
 return collections.paymentSettings || null;
 },
 update: (settings) => {
 const state = backendContext.getState?.();
 if (state) {
 state.paymentSettings = { ...(state.paymentSettings || {}), ...settings };
 }
 },
 };

 return {
 courseRepo,
 studentRepo,
 accountRepo,
 enrollmentRepo,
 scheduleSessionRepo,
 scheduleAssignmentRepo,
 attendanceRepo,
 certificateRepo,
 blogRepo,
 galleryRepo,
 profileRepo,
 accreditationRepo,
 paymentSettingsRepo,
 };
}