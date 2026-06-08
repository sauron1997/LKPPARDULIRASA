/**
 * Enrollment Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { enrollments } from '../db/schema/learning.js';

export function createEnrollmentDrizzleRepo(db) {
  return {
    list: async () => db.select().from(enrollments),
    getById: async (id) => {
      const [row] = await db.select().from(enrollments).where(eq(enrollments.id, String(id)));
      return row || null;
    },
    getByStudentId: async (studentId) => {
      const [row] = await db.select().from(enrollments).where(eq(enrollments.studentId, Number(studentId)));
      return row || null;
    },
    listByStudentId: async (studentId) =>
      db.select().from(enrollments).where(eq(enrollments.studentId, Number(studentId))),
    listByCourseId: async (courseId) =>
      db.select().from(enrollments).where(eq(enrollments.courseId, Number(courseId))),
    insert: async (record) => {
      const [row] = await db.insert(enrollments).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const existing = await this.getById(id);
      const payload = typeof data === 'function' ? data(existing) : data;
      const [row] = await db.update(enrollments).set({ ...payload, updatedAt: new Date() }).where(eq(enrollments.id, String(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(enrollments).where(eq(enrollments.id, String(id))).returning();
      return row || null;
    },
  };
}
