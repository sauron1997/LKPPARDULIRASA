/**
 * Message Repository — Drizzle/PostgreSQL implementation.
 */
import { eq } from 'drizzle-orm';
import { messageThreads } from '../db/schema/messaging.js';

export function createMessageDrizzleRepo(db) {
  return {
    listPublic: async () =>
      db.select().from(messageThreads).where(eq(messageThreads.channel, 'public')),
    listStudent: async () =>
      db.select().from(messageThreads).where(eq(messageThreads.channel, 'student')),
    getById: async (id) => {
      const [row] = await db.select().from(messageThreads).where(eq(messageThreads.id, String(id)));
      return row || null;
    },
  };
}