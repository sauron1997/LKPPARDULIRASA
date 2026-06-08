/**
 * Module Verification Script — Phase 8.5 hardening.
 *
 * Verifies that all extracted modules can be imported and instantiated
 * without runtime errors. Acts as a structural regression check beyond
 * the dev-smoke.mjs test.
 *
 * Run: node scripts/verify-modules.mjs
 */

const failures = [];
let passed = 0;

async function verify(label, fn) {
  try {
    await fn();
    passed++;
  } catch (error) {
    failures.push({ label, error: error.message || String(error) });
  }
}

// --- Runtime layer ---
await verify('runtime/backend-context.js exports createBackendContext', async () => {
  const mod = await import('../apps/api/src/runtime/backend-context.js');
  if (typeof mod.createBackendContext !== 'function') throw new Error('Missing createBackendContext');
  const ctx = mod.createBackendContext();
  if (!ctx.repositories) throw new Error('Missing repositories');
  if (!ctx.getCollections) throw new Error('Missing getCollections');
  if (!ctx.getIndexes) throw new Error('Missing getIndexes');
  if (typeof ctx.now !== 'function') throw new Error('Missing now()');
});

await verify('runtime/errors.js exports ensure + createServiceError', async () => {
  const mod = await import('../apps/api/src/runtime/errors.js');
  if (typeof mod.ensure !== 'function') throw new Error('Missing ensure');
  if (typeof mod.createServiceError !== 'function') throw new Error('Missing createServiceError');
  // Test ensure passes on truthy
  mod.ensure(true, 'should not throw');
  // Test ensure throws on falsy
  try {
    mod.ensure(false, 'test error', 400, 'TEST_CODE');
    throw new Error('ensure(false) did not throw');
  } catch (e) {
    if (e.code !== 'TEST_CODE') throw new Error(`Wrong error code: ${e.code}`);
  }
});

// --- Extracted modules ---
await verify('messages/thread-utils.js exports normalizeThread + compareByUpdatedDesc', async () => {
  const mod = await import('../apps/api/src/modules/messages/thread-utils.js');
  if (typeof mod.normalizeThread !== 'function') throw new Error('Missing normalizeThread');
  if (typeof mod.compareByUpdatedDesc !== 'function') throw new Error('Missing compareByUpdatedDesc');
  // Basic sort test
  const items = [{ updatedAt: '2024-01-01' }, { updatedAt: '2024-06-01' }];
  const sorted = items.sort(mod.compareByUpdatedDesc);
  if (sorted[0].updatedAt !== '2024-06-01') throw new Error('Sort order wrong');
});

await verify('student/student-portal.js exports getStudentPortal', async () => {
  const mod = await import('../apps/api/src/modules/student/student-portal.js');
  if (typeof mod.getStudentPortal !== 'function') throw new Error('Missing getStudentPortal');
});

await verify('student/student-schedule.service.js exports createStudentScheduleService', async () => {
  const mod = await import('../apps/api/src/modules/student/student-schedule.service.js');
  if (typeof mod.createStudentScheduleService !== 'function') throw new Error('Missing factory');
  const svc = mod.createStudentScheduleService();
  if (typeof svc.getStudentSchedules !== 'function') throw new Error('Missing getStudentSchedules');
  if (typeof svc.getStudentAttendance !== 'function') throw new Error('Missing getStudentAttendance');
  if (typeof svc.checkInStudentSchedule !== 'function') throw new Error('Missing checkInStudentSchedule');
});

await verify('assessments/certificates.service.js exports createCertificatesService', async () => {
  const mod = await import('../apps/api/src/modules/assessments/certificates.service.js');
  if (typeof mod.createCertificatesService !== 'function') throw new Error('Missing factory');
  const svc = mod.createCertificatesService();
  if (typeof svc.listCertificates !== 'function') throw new Error('Missing listCertificates');
  if (typeof svc.upsertCertificate !== 'function') throw new Error('Missing upsertCertificate');
  if (typeof svc.deleteCertificate !== 'function') throw new Error('Missing deleteCertificate');
});

// --- Module services (factory instantiation) ---
await verify('student/student.service.js exports createStudentService', async () => {
  const mod = await import('../apps/api/src/modules/student/student.service.js');
  if (typeof mod.createStudentService !== 'function') throw new Error('Missing factory');
  const svc = mod.createStudentService();
  if (typeof svc.getDashboard !== 'function') throw new Error('Missing getDashboard');
  if (typeof svc.getProfile !== 'function') throw new Error('Missing getProfile');
  if (typeof svc.listMessages !== 'function') throw new Error('Missing listMessages');
});

await verify('assessments/assessments.service.js exports createAssessmentsService', async () => {
  const mod = await import('../apps/api/src/modules/assessments/assessments.service.js');
  if (typeof mod.createAssessmentsService !== 'function') throw new Error('Missing factory');
  const svc = mod.createAssessmentsService();
  if (typeof svc.listDefinitions !== 'function') throw new Error('Missing listDefinitions');
  if (typeof svc.submitAssessment !== 'function') throw new Error('Missing submitAssessment');
  if (typeof svc.listCertificates !== 'function') throw new Error('Missing listCertificates');
});

await verify('payments/payments.service.js exports createPaymentsService', async () => {
  const mod = await import('../apps/api/src/modules/payments/payments.service.js');
  if (typeof mod.createPaymentsService !== 'function') throw new Error('Missing factory');
});

await verify('registrations/registrations.service.js exports createRegistrationsService', async () => {
  const mod = await import('../apps/api/src/modules/registrations/registrations.service.js');
  if (typeof mod.createRegistrationsService !== 'function') throw new Error('Missing factory');
});

await verify('classroom/classroom.service.js exports createClassroomService', async () => {
  const mod = await import('../apps/api/src/modules/classroom/classroom.service.js');
  if (typeof mod.createClassroomService !== 'function') throw new Error('Missing factory');
});

// --- legacy-bridge must NOT exist ---
await verify('legacy-bridge.js is deleted (import should fail)', async () => {
  try {
    await import('../apps/api/src/runtime/legacy-bridge.js');
    throw new Error('legacy-bridge.js should not exist');
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') return; // expected
    if (e.message?.includes('decommissioned')) return; // tombstone still there
    if (e.message === 'legacy-bridge.js should not exist') throw e;
    // Any other import error means file doesn't load — acceptable
  }
});

// --- Report ---
console.log('');
if (failures.length === 0) {
  console.log(`✅ All ${passed} module verifications passed.`);
  process.exit(0);
} else {
  console.log(`❌ ${failures.length} failure(s) out of ${passed + failures.length} checks:`);
  failures.forEach(({ label, error }) => {
    console.log(`   FAIL: ${label}`);
    console.log(`         ${error}`);
  });
  process.exit(1);
}
