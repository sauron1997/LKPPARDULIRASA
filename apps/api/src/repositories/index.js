/**
 * Repository Factory — single entry point for all repository resolution.
 *
 * Resolution priority:
 *  1. forceInMemory === true  → memory repos
 *  2. opts.db provided        → Drizzle repos with supplied db instance
 *  3. DATABASE_URL configured → Drizzle repos with global db instance
 *  4. backendContext provided → memory repos (in-memory / dev / demo mode)
 *  5. otherwise              → throw configuration error
 *
 * Both paths return { type, repos } with the same interface contract.
 */
import { isDatabaseConfigured, db } from '../db/client.js';
import { createMemoryRepositories } from './memory-repositories.js';

import { createStudentDrizzleRepo } from './student.drizzle-repo.js';
import { createCourseDrizzleRepo } from './course.drizzle-repo.js';
import { createEnrollmentDrizzleRepo } from './enrollment.drizzle-repo.js';
import { createScheduleSessionDrizzleRepo, createScheduleAssignmentDrizzleRepo } from './schedule.drizzle-repo.js';
import { createAttendanceDrizzleRepo } from './attendance.drizzle-repo.js';
import { createCertificateDrizzleRepo } from './certificate.drizzle-repo.js';
import { createAssessmentDrizzleRepo } from './assessment.drizzle-repo.js';
import { createMessageDrizzleRepo } from './message.drizzle-repo.js';

/**
 * Creates a full set of Drizzle-backed repositories.
 * All methods return Promises.
 *
 * @param {Object} drizzleDb - optional drizzle db instance (defaults to global db)
 */
export function createDrizzleRepositories(drizzleDb) {
  const d = drizzleDb || db;
  if (!d) {
    throw new Error(
      'DATABASE_URL is not configured. Cannot create Drizzle repositories. ' +
      'Set DATABASE_URL in .env or use forceInMemory:true for dev mode.'
    );
  }

  return {
    studentRepo: createStudentDrizzleRepo(d),
    courseRepo: createCourseDrizzleRepo(d),
    enrollmentRepo: createEnrollmentDrizzleRepo(d),
    scheduleSessionRepo: createScheduleSessionDrizzleRepo(d),
    scheduleAssignmentRepo: createScheduleAssignmentDrizzleRepo(d),
    attendanceRepo: createAttendanceDrizzleRepo(d),
    certificateRepo: createCertificateDrizzleRepo(d),
    assessmentRepo: createAssessmentDrizzleRepo(d),
    messageRepo: createMessageDrizzleRepo(d),
  };
}

/**
 * Smart repository factory.
 * Returns { type: 'memory' | 'drizzle', repos } based on config.
 *
 * @param {Object} opts
 * @param {Object}  [opts.backendContext]  - in-memory backend context (for memory mode)
 * @param {Object}  [opts.db]             - drizzle db instance (overrides global)
 * @param {boolean} [opts.forceInMemory]  - force memory mode regardless of DATABASE_URL
 */
export function createRepositories(opts = {}) {
  const { backendContext, forceInMemory } = opts;
  const drizzleDb = opts.db;

  // Priority 1: explicit force
  if (forceInMemory) {
    if (!backendContext) {
      throw new Error(
        'forceInMemory=true requires backendContext to be provided.'
      );
    }
    return { type: 'memory', repos: createMemoryRepositories(backendContext) };
  }

  // Priority 2+3: Drizzle if DB available
  if (drizzleDb || isDatabaseConfigured) {
    return { type: 'drizzle', repos: createDrizzleRepositories(drizzleDb) };
  }

  // Priority 4: fallback to memory
  if (backendContext) {
    return { type: 'memory', repos: createMemoryRepositories(backendContext) };
  }

  throw new Error(
    'Repository configuration error: no DATABASE_URL and no backendContext provided. ' +
    'Set DATABASE_URL for production or pass backendContext for dev/demo mode.'
  );
}

export { isDatabaseConfigured };
