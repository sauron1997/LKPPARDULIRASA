/**
 * Student Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { students } from '../db/schema/users.js';

export function createStudentDrizzleRepo(db) {
  return {
    list: async () => db.select().from(students),
    getById: async (id) => {
      const [row] = await db.select().from(students).where(eq(students.id, Number(id)));
      return row || null;
    },
    getByStudentId: async (studentId) => {
      const [row] = await db.select().from(students).where(eq(students.id, Number(studentId)));
      return row || null;
    },
    insert: async (record) => {
      const [row] = await db.insert(students).values(record).returning();
      return row;
    },
    update: async (id, data) => {
      const payload = typeof data === 'function' ? data(await this.getById(id)) : data;
      const [row] = await db.update(students).set({ ...payload, updatedAt: new Date() }).where(eq(students.id, Number(id))).returning();
      return row || null;
    },
    remove: async (id) => {
      const [row] = await db.delete(students).where(eq(students.id, Number(id))).returning();
      return row || null;
    },
  };
}