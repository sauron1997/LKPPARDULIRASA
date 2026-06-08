/**
 * Course Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { courses, courseModules } from '../db/schema/catalog.js';

export function createCourseDrizzleRepo(db) {
  return {
    list: async () => db.select().from(courses),
    getById: async (id) => {
      const [row] = await db.select().from(courses).where(eq(courses.id, Number(id)));
      return row || null;
    },
    listModules: async (courseId) =>
      db.select().from(courseModules).where(eq(courseModules.courseId, Number(courseId))),
    insert: async (record) => {
      const [row] = await db.insert(courses).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const payload = typeof data === 'function' ? data(await this.getById(id)) : data;
      const [row] = await db.update(courses).set({ ...payload, updatedAt: new Date() }).where(eq(courses.id, Number(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(courses).where(eq(courses.id, Number(id))).returning();
      return row || null;
    },
  };
}