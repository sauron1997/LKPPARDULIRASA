/**
 * Assessment Repository — Drizzle/PostgreSQL implementation.
 * Covers definitions, progress, and submissions.
 */
import { eq } from 'drizzle-orm';
import {
  assessmentDefinitions,
  assessmentProgress,
  assessmentSubmissions,
} from '../db/schema/learning.js';

export function createAssessmentDrizzleRepo(db) {
  return {
    listDefinitions: async () => db.select().from(assessmentDefinitions),
    listDefinitionsByCourseId: async (courseId) =>
      db.select().from(assessmentDefinitions).where(eq(assessmentDefinitions.courseId, Number(courseId))),
    getDefinitionById: async (id) => {
      const [row] = await db.select().from(assessmentDefinitions).where(eq(assessmentDefinitions.id, String(id)));
      return row || null;
    },
    listProgress: async () => db.select().from(assessmentProgress),
    listProgressByEnrollmentId: async (enrollmentId) =>
      db.select().from(assessmentProgress).where(eq(assessmentProgress.enrollmentId, String(enrollmentId))),
    listProgressByStudentId: async (studentId) =>
      db.select().from(assessmentProgress).where(eq(assessmentProgress.studentId, Number(studentId))),
    upsertProgress: async (record) => {
      const [row] = await db
        .insert(assessmentProgress)
        .values(record)
        .onConflictDoUpdate({ target: [assessmentProgress.enrollmentId, assessmentProgress.type], set: { ...record, updatedAt: new Date() } })
        .returning();
      return row;
    },
    listSubmissions: async () => db.select().from(assessmentSubmissions),
    listSubmissionsByEnrollmentId: async (enrollmentId) =>
      db.select().from(assessmentSubmissions).where(eq(assessmentSubmissions.enrollmentId, String(enrollmentId))),
    getSubmissionById: async (id) => {
      const [row] = await db.select().from(assessmentSubmissions).where(eq(assessmentSubmissions.id, String(id)));
      return row || null;
    },
    insertSubmission: async (record) => {
      const [row] = await db.insert(assessmentSubmissions).values(record).returning();
      return row;
    },
    updateSubmission: async (id, data) => {
      const [row] = await db.update(assessmentSubmissions).set({ ...data, updatedAt: new Date() }).where(eq(assessmentSubmissions.id, String(id))).returning();
      return row || null;
    },
  };
}
