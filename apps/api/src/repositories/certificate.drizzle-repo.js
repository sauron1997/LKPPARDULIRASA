/**
 * Certificate Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { certificates } from '../db/schema/learning.js';

export function createCertificateDrizzleRepo(db) {
  return {
    list: async () => db.select().from(certificates),
    getById: async (id) => {
      const [row] = await db.select().from(certificates).where(eq(certificates.id, String(id)));
      return row || null;
    },
    getByStudentId: async (studentId) => {
      const [row] = await db.select().from(certificates).where(eq(certificates.studentId, Number(studentId)));
      return row || null;
    },
    listByCourseId: async (courseId) =>
      db.select().from(certificates).where(eq(certificates.courseId, Number(courseId))),
    insert: async (record) => {
      const [row] = await db.insert(certificates).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const [row] = await db.update(certificates).set({ ...data, updatedAt: new Date() }).where(eq(certificates.id, String(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(certificates).where(eq(certificates.id, String(id))).returning();
      return row || null;
    },
  };
}