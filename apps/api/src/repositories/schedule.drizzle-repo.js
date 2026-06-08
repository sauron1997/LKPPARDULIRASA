/**
 * Schedule Repository — Drizzle/PostgreSQL implementation.
 * Covers scheduleSessions + scheduleAssignments.
 */
import { eq, and } from 'drizzle-orm';
import { scheduleSessions, scheduleAssignments } from '../db/schema/learning.js';

export function createScheduleSessionDrizzleRepo(db) {
  return {
    list: async () => db.select().from(scheduleSessions),
    getById: async (id) => {
      const [row] = await db.select().from(scheduleSessions).where(eq(scheduleSessions.id, String(id)));
      return row || null;
    },
    listByCourseId: async (courseId) =>
      db.select().from(scheduleSessions).where(eq(scheduleSessions.courseId, Number(courseId))),
    insert: async (record) => {
      const [row] = await db.insert(scheduleSessions).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const [row] = await db.update(scheduleSessions).set({ ...data, updatedAt: new Date() }).where(eq(scheduleSessions.id, String(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(scheduleSessions).where(eq(scheduleSessions.id, String(id))).returning();
      return row || null;
    },
  };
}

export function createScheduleAssignmentDrizzleRepo(db) {
  return {
    list: async () => db.select().from(scheduleAssignments),
    listAll: async () => db.select().from(scheduleAssignments),
    getById: async (id) => {
      const [row] = await db.select().from(scheduleAssignments).where(eq(scheduleAssignments.id, String(id)));
      return row || null;
    },
    listBySessionId: async (sessionId) =>
      db.select().from(scheduleAssignments).where(eq(scheduleAssignments.sessionId, String(sessionId))),
    listByEnrollmentId: async (enrollmentId) =>
      db.select().from(scheduleAssignments).where(eq(scheduleAssignments.enrollmentId, String(enrollmentId))),
    insert: async (record) => {
      const [row] = await db.insert(scheduleAssignments).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const [row] = await db.update(scheduleAssignments).set({ ...data, updatedAt: new Date() }).where(eq(scheduleAssignments.id, String(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, String(id))).returning();
      return row || null;
    },
    removeBySessionId: async (sessionId) => {
      await db.delete(scheduleAssignments).where(eq(scheduleAssignments.sessionId, String(sessionId)));
    },
  };
}