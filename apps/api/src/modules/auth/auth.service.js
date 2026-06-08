/**
 * Auth Service — zero dependency on legacy admin.service.js (Phase 8migration).
 */
import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure, createServiceError } from '../../runtime/errors.js';
import { normalizeLoginIdentifier, getAccountIdentifiers, buildSessionUser, findCourseByReference, findEnrollmentByReference } from '@lkp-parduli-rasa/domain/domain-relations';

function createSessionToken() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function extractBearerToken(input) {
  const header = String(input || '').trim();
  if (!header) return '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header;
}

export function createAuthService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  function findAccountByIdentifier(identifier) {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);
    const students = repositories.students.raw();
    return repositories.accounts.raw().find((account) => {
      if (String(account.status || 'active').toLowerCase() !== 'active') return false;
      const student = students.find((s) => String(s.id) === String(account.studentId)) || null;
      const identifiers = getAccountIdentifiers(account, student);
      return identifiers.includes(normalizedIdentifier);
    }) || null;
  }

  function buildSessionUserLocal(account) {
    if (!account) return null;
    const student = repositories.students.raw().find((item) => (
      String(item.id) === String(account.studentId) || String(item.accountId) === String(account.id)
    )) || null;
    const enrollment = findEnrollmentByReference(repositories.enrollments.raw(), {
      enrollmentId: account.enrollmentId || student?.enrollmentId,
      studentId: account.studentId || student?.id,
      courseId: account.courseId || student?.courseId,
      program: student?.program,
    }, repositories.courses.raw());
    const course = findCourseByReference(repositories.courses.raw(), {
      courseId: enrollment?.courseId || account.courseId || student?.courseId,
      program: student?.program,
    });
    return buildSessionUser({ account, student, enrollment, course });
  }

  return {
    authenticate(payload = {}) {
      ensure(payload.identifier, 'Identifier login wajib diisi.',400, 'IDENTIFIER_REQUIRED');
      ensure(payload.password, 'Password wajib diisi.', 400, 'PASSWORD_REQUIRED');

      const account = findAccountByIdentifier(payload.identifier);
      ensure(account, 'Email/NIS/username atau password salah.', 401, 'INVALID_CREDENTIALS');
      ensure(String(account.password || '') === String(payload.password || ''), 'Email/NIS/username atau password salah.', 401, 'INVALID_CREDENTIALS');

      const token = createSessionToken();
      const sessionUser = buildSessionUserLocal(account);

      repositories.sessions.insert({
        id: token,
        token,
        accountId: account.id,
        studentId: account.studentId,
        role: account.role || 'student',
        createdAt: context.now(),});

      return { token, user: sessionUser };
    },

    validateSession(token) {
      if (!token) return null;
      const session = repositories.sessions.raw().find((s) => String(s.token) === String(token)) || null;
      if (!session) return null;
      const account = repositories.accounts.raw().find((a) => String(a.id) === String(session.accountId)) || null;
      if (!account) return null;
      return buildSessionUserLocal(account);
    },

    logout(token) {
      if (!token) return false;
      const session = repositories.sessions.raw().find((s) => String(s.token) === String(token)) || null;
      if (session) repositories.sessions.remove(session.id);
      return Boolean(session);
    },

    getContext() {
      return context;
    },
  };
}

export default createAuthService;