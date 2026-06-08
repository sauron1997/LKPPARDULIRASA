/**
 * Attendance Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { attendanceRecords } from '../db/schema/learning.js';

export function createAttendanceDrizzleRepo(db) {
  return {
    list: async () => db.select().from(attendanceRecords),
    getById: async (id) => {
      const [row] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, String(id)));
      return row || null;
    },
    listBySessionId: async (sessionId) =>
      db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, String(sessionId))),
    listByEnrollmentId: async (enrollmentId) =>
      db.select().from(attendanceRecords).where(eq(attendanceRecords.enrollmentId, String(enrollmentId))),
    insert: async (record) => {
      const [row] = await db.insert(attendanceRecords).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const [row] = await db.update(attendanceRecords).set({ ...data, updatedAt: new Date() }).where(eq(attendanceRecords.id, String(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(attendanceRecords).where(eq(attendanceRecords.id, String(id))).returning();
      return row || null;
    },
  };
}